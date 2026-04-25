// src/app/core/services/incident.service.ts
// Full Firestore real-time integration.
// FIX (prev): Auto-delete completed reports older than 1 week.
// FIX (new): Sends in-app notifications to victim on volunteer assignment + completion.

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore,
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, arrayUnion, Unsubscribe, getDoc, getDocs
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { Incident, AssignmentHistory, Review } from '../../models/incident.model';
import { VolunteerService } from './volunteer.service';
import { NotificationService } from './notification.service';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class IncidentService implements OnDestroy {
  private incidentsSubject = new BehaviorSubject<Incident[]>([]);
  private app: FirebaseApp;
  private db: Firestore;
  private unsub?: Unsubscribe;
  private cleanupIntervalId?: any;

  constructor(
    private volunteerService: VolunteerService,
    private notificationService: NotificationService
  ) {
    if (!getApps().length) {
      this.app = initializeApp(environment.firebase);
    } else {
      this.app = getApps()[0];
    }
    this.db = getFirestore(this.app);
    this._listen();
    this._deleteOldCompletedReports();
    this.cleanupIntervalId = setInterval(() => this._deleteOldCompletedReports(), 60 * 60 * 1000);
  }

  private _listen(): void {
    const colRef = collection(this.db, 'incidents');
    this.unsub = onSnapshot(colRef, snapshot => {
      const incidents: Incident[] = [];
      snapshot.forEach(d => incidents.push(d.data() as Incident));
      incidents.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      this.incidentsSubject.next(incidents);
    }, err => console.error('Incident listener error:', err));
  }

  private async _deleteOldCompletedReports(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - ONE_WEEK_MS).toISOString();
      const snapshot = await getDocs(collection(this.db, 'incidents'));
      const toDelete: string[] = [];
      snapshot.forEach(docSnap => {
        const incident = docSnap.data() as Incident;
        if (incident.status === 'completed' && incident.completedAt && incident.completedAt < cutoffDate) {
          toDelete.push(docSnap.id);
        }
      });
      await Promise.all(toDelete.map(id => deleteDoc(doc(this.db, 'incidents', id))));
      if (toDelete.length > 0) console.log(`[Cleanup] Auto-deleted ${toDelete.length} completed report(s) older than 1 week.`);
    } catch (err) {
      console.error('[Cleanup] Error during auto-delete:', err);
    }
  }

  getActiveIncidents(): Observable<Incident[]> {
    return this.incidentsSubject.asObservable();
  }

  getIncidentsByVictim(victimId: string): Observable<Incident[]> {
    return this.incidentsSubject.pipe(
      map(incidents => incidents.filter(i => i.victimId === victimId))
    );
  }

  getIncidentsByVolunteer(volunteerId: string): Observable<Incident[]> {
    return this.incidentsSubject.pipe(
      map(incidents => incidents.filter(i => i.volunteerId === volunteerId && i.status === 'assigned'))
    );
  }

  getMissionHistory(volunteerId: string): Observable<Incident[]> {
    return this.incidentsSubject.pipe(
      map(incidents => incidents.filter(i => i.volunteerId === volunteerId))
    );
  }

  async createIncident(data: Omit<Incident, 'id' | 'missionId'>): Promise<string> {
    const timestamp = Date.now();
    const missionId = 'MISSION-' + timestamp + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const incidentId = 'incident-' + timestamp;
    const newIncident: Incident = { ...data, id: incidentId, missionId, reviews: [] };
    await setDoc(doc(this.db, 'incidents', incidentId), newIncident);
    return missionId;
  }

  // ── Assign volunteer + notify victim ─────────────────────

  async assignVolunteer(
    incidentId: string,
    volunteerId: string,
    volunteerName: string = ''
  ): Promise<void> {
    const assignedAt = new Date().toISOString();
    const incident = this.incidentsSubject.value.find(i => i.id === incidentId);
    if (!incident) throw new Error('Incident not found');

    await updateDoc(doc(this.db, 'incidents', incidentId), {
      volunteerId, volunteerName, status: 'assigned'
    });

    const historyEntry: AssignmentHistory = {
      missionId: incident.missionId || incidentId,
      incidentId,
      incidentTitle: incident.title,
      incidentType: incident.type,
      victimId: incident.victimId || '',
      volunteerId,
      volunteerName,
      assignedAt,
      status: 'assigned',
      urgency: incident.urgency,
      locationName: incident.locationName || '',
      latitude: incident.latitude,
      longitude: incident.longitude
    };
    await this.volunteerService.addMissionToHistory(volunteerId, historyEntry);

    // ── Notify victim that a volunteer has been assigned ──
    if (incident.victimId) {
      try {
        await this.notificationService.sendNotification({
          recipientEmail: incident.victimId,
          type: 'volunteer_assigned',
          title: '🙌 Volunteer Assigned to Your Report',
          message: `${volunteerName} has been assigned to handle your report "${incident.title}". They are on their way to assist you. Please stay safe.`,
          incidentId,
          incidentTitle: incident.title,
          volunteerName
        });
      } catch (e) {
        console.warn('Failed to send assignment notification:', e);
      }
    }
  }

  // ── Mark completed + notify victim ───────────────────────

  async markCompleted(incidentId: string): Promise<void> {
    const completedAt = new Date().toISOString();
    await updateDoc(doc(this.db, 'incidents', incidentId), { status: 'completed', completedAt });

    const incident = this.incidentsSubject.value.find(i => i.id === incidentId);
    if (incident?.volunteerId) {
      const vol = this.volunteerService.getVolunteerById(incident.volunteerId);
      if (vol?.missionHistory) {
        const updatedHistory = vol.missionHistory.map(h =>
          h.incidentId === incidentId ? { ...h, status: 'completed' as const, completedAt } : h
        );
        await this.volunteerService.updateVolunteerProfile(vol.email, {
          missionHistory: updatedHistory,
          status: 'available'
        });
      }
    }

    // ── Notify victim that their incident has been resolved ──
    if (incident?.victimId) {
      try {
        await this.notificationService.sendNotification({
          recipientEmail: incident.victimId,
          type: 'incident_completed',
          title: '✅ Your Incident Has Been Resolved',
          message: `Your report "${incident.title}" has been marked as resolved by ${incident.volunteerName || 'the volunteer'}. We hope you are safe! You can now rate your experience from My Reports.`,
          incidentId,
          incidentTitle: incident.title,
          volunteerName: incident.volunteerName
        });
      } catch (e) {
        console.warn('Failed to send completion notification:', e);
      }
    }
  }

  async addReview(incidentId: string, review: Omit<Review, 'id'>): Promise<void> {
    const reviewWithId: Review = { ...review, id: 'review-' + Date.now() };
    await updateDoc(doc(this.db, 'incidents', incidentId), { reviews: arrayUnion(reviewWithId) });
  }

  static haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  ngOnDestroy(): void {
    if (this.unsub) this.unsub();
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);
  }
}
