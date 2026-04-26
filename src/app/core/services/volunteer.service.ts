import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AssignmentHistory } from '../../models/incident.model';

export interface VolunteerProfile {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  location?: string;
  skills?: string;
  registeredAt: string;
  status: 'available' | 'assigned' | 'offline';
  missionHistory?: AssignmentHistory[];
}

@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private volunteersSubject = new BehaviorSubject<VolunteerProfile[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('ci_volunteers');
      const volunteers: VolunteerProfile[] = stored ? JSON.parse(stored) : [];
      this.volunteersSubject.next(volunteers);
    } catch {
      this.volunteersSubject.next([]);
    }
  }

  private saveToStorage(volunteers: VolunteerProfile[]): void {
    localStorage.setItem('ci_volunteers', JSON.stringify(volunteers));
  }

  getVolunteers(): Observable<VolunteerProfile[]> {
    return this.volunteersSubject.asObservable();
  }

  getVolunteersList(): VolunteerProfile[] {
    return this.volunteersSubject.value;
  }

  registerVolunteer(email: string, displayName: string): void {
    const current = this.volunteersSubject.value;
    // Avoid duplicates
    if (current.find(v => v.email === email)) return;

    const newVol: VolunteerProfile = {
      id: 'vol-' + Date.now(),
      displayName,
      email,
      registeredAt: new Date().toISOString(),
      status: 'available'
    };
    const updated = [...current, newVol];
    this.volunteersSubject.next(updated);
    this.saveToStorage(updated);
  }

  updateVolunteerStatus(id: string, status: 'available' | 'assigned' | 'offline'): void {
    const updated = this.volunteersSubject.value.map(v =>
      v.id === id ? { ...v, status } : v
    );
    this.volunteersSubject.next(updated);
    this.saveToStorage(updated);
  }

  updateVolunteerProfile(email: string, updates: Partial<VolunteerProfile>): void {
    const updated = this.volunteersSubject.value.map(v =>
      v.email === email ? { ...v, ...updates } : v
    );
    this.volunteersSubject.next(updated);
    this.saveToStorage(updated);
  }

  getVolunteerByEmail(email: string): VolunteerProfile | undefined {
    return this.volunteersSubject.value.find(v => v.email === email);
  }

  getVolunteerById(id: string): VolunteerProfile | undefined {
    return this.volunteersSubject.value.find(v => v.id === id);
  }

  addMissionToHistory(volunteerId: string, entry: AssignmentHistory): void {
    const updated = this.volunteersSubject.value.map(v => {
      if (v.id === volunteerId) {
        const history = v.missionHistory || [];
        return { ...v, missionHistory: [...history, entry], status: 'assigned' as const };
      }
      return v;
    });
    this.volunteersSubject.next(updated);
    this.saveToStorage(updated);
  }
}
