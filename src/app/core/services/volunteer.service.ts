
// src/app/core/services/volunteer.service.ts

// Real-time Firestore integration for volunteers.

// Volunteers collection: volunteers/{email}

// Each volunteer doc has a missionHistory[] array tracking every assigned mission.

import { Injectable, OnDestroy } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

import {

  getFirestore, Firestore,

  collection, doc, setDoc, updateDoc, onSnapshot,

  arrayUnion, Unsubscribe, getDocs

} from 'firebase/firestore';

import { environment } from '../../../environments/environment';

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

export class VolunteerService implements OnDestroy {

  private volunteersSubject = new BehaviorSubject<VolunteerProfile[]>([]);

  private app: FirebaseApp;

  private db: Firestore;

  private unsub?: Unsubscribe;

  constructor() {

    if (!getApps().length) {

      this.app = initializeApp(environment.firebase);

    } else {

      this.app = getApps()[0];

    }

    this.db = getFirestore(this.app);

    this._listenToVolunteers();

  }

  // ── Real-time Firestore listener ─────────────────────────

  private _listenToVolunteers(): void {

    const colRef = collection(this.db, 'volunteers');

    this.unsub = onSnapshot(colRef, snapshot => {

      const vols: VolunteerProfile[] = [];

      snapshot.forEach(d => vols.push(d.data() as VolunteerProfile));

      this.volunteersSubject.next(vols);

    }, err => {

      console.error('Volunteer listener error:', err);

    });

  }

  getVolunteers(): Observable<VolunteerProfile[]> {

    return this.volunteersSubject.asObservable();

  }

  getVolunteersList(): VolunteerProfile[] {

    return this.volunteersSubject.value;

  }

  // ── Register a new volunteer (called from AuthService) ───

  async registerVolunteer(

    email: string,

    displayName: string,

    extraData?: Partial<VolunteerProfile>

  ): Promise<void> {

    const normalizedEmail = email.trim().toLowerCase();

    const current = this.volunteersSubject.value;

    if (current.find(v => v.email === normalizedEmail)) return; // already exists

    const newVol: VolunteerProfile = {

      id: 'vol-' + Date.now(),

      displayName,

      email: normalizedEmail,

      registeredAt: new Date().toISOString(),

      status: 'available',

      missionHistory: [],

      ...extraData

    };

    await setDoc(doc(this.db, 'volunteers', normalizedEmail), newVol);

  }

  // ── Update volunteer status (available / assigned / offline) ──

  async updateVolunteerStatus(id: string, status: 'available' | 'assigned' | 'offline'): Promise<void> {

    // id is the vol uid; find by matching the subject list

    const vol = this.volunteersSubject.value.find(v => v.id === id);

    if (!vol) return;

    await updateDoc(doc(this.db, 'volunteers', vol.email), { status });

  }

  // ── Append a mission to the volunteer's history ──────────
  // FIX: volunteerId is now the volunteer's email (matches getUserId() = userEmail).
  // Find by email first, fall back to id lookup for backward compatibility.

  async addMissionToHistory(volunteerId: string, mission: AssignmentHistory): Promise<void> {

    const vol = this.volunteersSubject.value.find(
      v => v.email === volunteerId || v.id === volunteerId
    );

    if (!vol) return;

    await updateDoc(doc(this.db, 'volunteers', vol.email), {

      missionHistory: arrayUnion(mission)

    });

  }

  // ── Update volunteer profile fields ─────────────────────

  async updateVolunteerProfile(email: string, updates: Partial<VolunteerProfile>): Promise<void> {

    const normalizedEmail = email.trim().toLowerCase();

    await updateDoc(doc(this.db, 'volunteers', normalizedEmail), updates as any);

  }

  getVolunteerByEmail(email: string): VolunteerProfile | undefined {

    return this.volunteersSubject.value.find(v => v.email === email.toLowerCase());

  }

  getVolunteerById(id: string): VolunteerProfile | undefined {

    // FIX: id may now be the volunteer's email (after the volunteerId unification fix).
    // Match by email first, then fall back to uid match.
    return this.volunteersSubject.value.find(v => v.email === id || v.id === id);

  }

  ngOnDestroy(): void {

    if (this.unsub) this.unsub();

  }

}
