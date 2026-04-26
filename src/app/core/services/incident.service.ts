import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, arrayUnion, Unsubscribe,
  QuerySnapshot, DocumentData
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase.config';
import { Incident, AssignmentHistory, Review } from '../../models/incident.model';
import { VolunteerService } from './volunteer.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class IncidentService implements OnDestroy {
  private incidentsSubject = new BehaviorSubject<Incident[]>([]);
  private unsub?: Unsubscribe;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  private get db() { return getFirestoreDb(); }

  constructor(
    private volunteerService: VolunteerService,
    private notifService: NotificationService
  ) {
    this._listen();
    this._deleteOldCompletedReports();
    this.cleanupInterval = setInterval(() => this._deleteOldCompletedReports(), 60 * 60 * 1000);
  }

  private _listen(): void {
    const colRef = collection(this.db, 'incidents');
    this.unsub = onSnapshot(
      colRef,
      (snap: QuerySnapshot<DocumentData>) => {
        const list: Incident[] = [];
        snap.forEach((d: any) => list.push(d.data() as Incident));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.incidentsSubject.next(list);
      },
      (err: Error) => console.error('Incident listener error:', err)
    );
  }

  private async _deleteOldCompletedReports(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const old = this.incidentsSubject.value.filter(
      i => i.status === 'completed' && !!i.completedAt && i.completedAt < cutoff
    );
    await Promise.all(old.map(i => deleteDoc(doc(this.db, 'incidents', i.id!))));
    if (old.length) console.log(`[Cleanup] Deleted ${old.length} old completed reports.`);
  }

  ngOnDestroy(): void {
    this.unsub?.();
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  getActiveIncidents(): Observable<Incident[]> { return this.incidentsSubject.asObservable(); }

  getIncidentsByVictim(victimId: string): Observable<Incident[]> {
    return this.incidentsSubject.pipe(map(i => i.filter(x => x.victimId === victimId)));
  }

  getIncidentsByVolunteer(volunteerId: string): Observable<Incident[]> {
    return this.incidentsSubject.pipe(
      map(i => i.filter(x => x.volunteerId === volunteerId && x.status === 'assigned'))
    );
  }

  getMissionHistory(volunteerId: string): Observable<Incident[]> {
    return this.incidentsSubject.pipe(map(i => i.filter(x => x.volunteerId === volunteerId)));
  }

  async createIncident(data: Omit<Incident, 'id' | 'missionId'>): Promise<string> {
    const ts = Date.now();
    const missionId = 'MISSION-' + ts + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const incidentId = 'incident-' + ts;
    await setDoc(doc(this.db, 'incidents', incidentId), { ...data, id: incidentId, missionId, reviews: [] });
    return missionId;
  }

  async assignVolunteer(incidentId: string, volunteerId: string, volunteerName: string = ''): Promise<void> {
    const incident = this.incidentsSubject.value.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found');
    await updateDoc(doc(this.db, 'incidents', incidentId), { volunteerId, volunteerName, status: 'assigned' });
    const histEntry: AssignmentHistory = {
      missionId: incident.missionId || incidentId, incidentId,
      incidentTitle: incident.title, incidentType: incident.type,
      victimId: incident.victimId || '', volunteerId, volunteerName,
      assignedAt: new Date().toISOString(), status: 'assigned',
      urgency: incident.urgency, locationName: incident.locationName || '',
      latitude: incident.latitude, longitude: incident.longitude
    };
    await this.volunteerService.addMissionToHistory(volunteerId, histEntry);
    if (incident.victimId && incident.victimId !== 'anonymous') {
      await this.notifService.notifyVolunteerAssigned(incident.victimId, incident.title, volunteerName, incidentId);
    }
  }

  async markCompleted(incidentId: string): Promise<void> {
    const completedAt = new Date().toISOString();
    const incident = this.incidentsSubject.value.find(i => i.id === incidentId);
    await updateDoc(doc(this.db, 'incidents', incidentId), { status: 'completed', completedAt });
    if (incident?.volunteerId) {
      const vol = this.volunteerService.getVolunteerById(incident.volunteerId);
      if (vol?.missionHistory) {
        const updatedHistory = vol.missionHistory.map((h: any) =>
          h.incidentId === incidentId ? { ...h, status: 'completed' as const, completedAt } : h
        );
        await this.volunteerService.updateVolunteerProfile(vol.email, { missionHistory: updatedHistory, status: 'available' });
      }
      if (incident.victimId && incident.victimId !== 'anonymous') {
        await this.notifService.notifyIncidentResolved(incident.victimId, incident.title, incident.volunteerName || 'Volunteer', incidentId);
      }
    }
  }

  async addReview(incidentId: string, review: Omit<Review, 'id'>): Promise<void> {
    const reviewWithId: Review = { ...review, id: 'review-' + Date.now() };
    await updateDoc(doc(this.db, 'incidents', incidentId), { reviews: arrayUnion(reviewWithId) });
  }

  async deleteIncident(incidentId: string, requestingVictimId: string): Promise<void> {
    const incident = this.incidentsSubject.value.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found.');
    if (incident.victimId !== requestingVictimId) throw new Error('You can only delete your own reports.');
    if (incident.status !== 'completed') throw new Error('Only resolved reports can be deleted.');
    await deleteDoc(doc(this.db, 'incidents', incidentId));
  }

  static haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
}
