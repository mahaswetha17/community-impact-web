// src/app/core/services/notification.service.ts
// Stores in-app alert notifications in Firestore under notifications/{email}/{notifId}.
// Triggered on: volunteer assignment, incident completion.
// The victim's dashboard and navbar badge subscribe to these in real-time.
// NOTE: For SMS/email delivery in production, integrate Firebase Extensions
//       (Trigger Email / Twilio SMS) by pointing them at this collection.

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore,
  collection, doc, setDoc, updateDoc, onSnapshot,
  query, orderBy, Unsubscribe, getDocs, where
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  recipientEmail: string;
  type: 'volunteer_assigned' | 'incident_completed' | 'general';
  title: string;
  message: string;
  incidentId?: string;
  incidentTitle?: string;
  volunteerName?: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private app: FirebaseApp;
  private db: Firestore;
  private unsub?: Unsubscribe;
  private currentEmail: string = '';

  constructor() {
    if (!getApps().length) {
      this.app = initializeApp(environment.firebase);
    } else {
      this.app = getApps()[0];
    }
    this.db = getFirestore(this.app);
  }

  // Call this after login so the service listens to the right user's notifications
  listenForUser(email: string): void {
    if (this.currentEmail === email) return;
    this.currentEmail = email;
    if (this.unsub) this.unsub();

    const colRef = collection(this.db, 'notifications', email, 'alerts');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    this.unsub = onSnapshot(q, snapshot => {
      const notifs: AppNotification[] = [];
      snapshot.forEach(d => notifs.push(d.data() as AppNotification));
      this.notificationsSubject.next(notifs);
    }, err => console.error('Notification listener error:', err));
  }

  getNotifications(): Observable<AppNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.read).length;
  }

  // ── Send a notification to a victim ──────────────────────
  // Called from IncidentService when a volunteer is assigned or incident completed.

  async sendNotification(params: {
    recipientEmail: string;
    type: AppNotification['type'];
    title: string;
    message: string;
    incidentId?: string;
    incidentTitle?: string;
    volunteerName?: string;
  }): Promise<void> {
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const notif: AppNotification = {
      id,
      recipientEmail: params.recipientEmail,
      type: params.type,
      title: params.title,
      message: params.message,
      incidentId: params.incidentId,
      incidentTitle: params.incidentTitle,
      volunteerName: params.volunteerName,
      read: false,
      createdAt: new Date().toISOString()
    };

    await setDoc(
      doc(this.db, 'notifications', params.recipientEmail, 'alerts', id),
      notif
    );
  }

  // Mark a single notification as read
  async markRead(email: string, notifId: string): Promise<void> {
    await updateDoc(
      doc(this.db, 'notifications', email, 'alerts', notifId),
      { read: true }
    );
  }

  // Mark all notifications as read
  async markAllRead(email: string): Promise<void> {
    const updates = this.notificationsSubject.value
      .filter(n => !n.read)
      .map(n =>
        updateDoc(doc(this.db, 'notifications', email, 'alerts', n.id), { read: true })
      );
    await Promise.all(updates);
  }

  ngOnDestroy(): void {
    if (this.unsub) this.unsub();
  }
}
