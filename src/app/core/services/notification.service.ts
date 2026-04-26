// src/app/core/services/notification.service.ts
// Stores notifications in Firestore. When a volunteer is assigned or mission completed,
// a notification document is written for the victim. The navbar polls in real time.
// Email/SMS alerts use EmailJS (free, client-side, no backend needed).

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore, collection, doc, setDoc,
  updateDoc, onSnapshot, query, where, orderBy,
  Unsubscribe, QuerySnapshot, DocumentData
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  userId: string;           // victimId (email) this notification belongs to
  type: 'assigned' | 'completed' | 'info';
  title: string;
  message: string;
  incidentId?: string;
  volunteerName?: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private app: FirebaseApp;
  private db: Firestore;
  private notifSubjects = new Map<string, BehaviorSubject<AppNotification[]>>();
  private unsubs = new Map<string, Unsubscribe>();

  constructor() {
    if (!getApps().length) {
      this.app = initializeApp(environment.firebase);
    } else {
      this.app = getApps()[0];
    }
    this.db = getFirestore(this.app);
  }

  // ── Real-time listener per user ──────────────────────────
  getNotifications(userId: string): Observable<AppNotification[]> {
    if (!userId || userId === 'anonymous') return of([]);

    if (!this.notifSubjects.has(userId)) {
      const subject = new BehaviorSubject<AppNotification[]>([]);
      this.notifSubjects.set(userId, subject);

      const colRef = collection(this.db, 'notifications');
      const unsub = onSnapshot(
        colRef,
        (snap: QuerySnapshot<DocumentData>) => {
          const notifs: AppNotification[] = [];
          snap.forEach((d: any) => {
            const n = d.data() as AppNotification;
            if (n.userId === userId) notifs.push(n);
          });
          notifs.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          subject.next(notifs);
        },
        (err: Error) => console.error('Notification listener error:', err)
      );
      this.unsubs.set(userId, unsub);
    }

    return this.notifSubjects.get(userId)!.asObservable();
  }

  // ── Write a notification to Firestore ──────────────────
  async notify(userId: string, data: Omit<AppNotification, 'id' | 'userId' | 'read' | 'createdAt'>): Promise<void> {
    if (!userId || userId === 'anonymous') return;
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const notif: AppNotification = {
      ...data,
      id,
      userId,
      read: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(this.db, 'notifications', id), notif);

    // Also send in-browser notification if permission granted
    this._sendBrowserAlert(notif);
  }

  // ── Convenience: notify victim that volunteer was assigned ──
  async notifyVolunteerAssigned(
    victimId: string,
    incidentTitle: string,
    volunteerName: string,
    incidentId: string
  ): Promise<void> {
    await this.notify(victimId, {
      type: 'assigned',
      title: '🚨 Volunteer Assigned to Your Report',
      message: `${volunteerName} has been assigned to your incident "${incidentTitle}" and is on their way to you.`,
      incidentId,
      volunteerName
    });

    // EmailJS alert (free tier — configure in environment.ts)
    this._sendEmailAlert(victimId, {
      subject: 'Community Impact — Volunteer Assigned',
      body: `Dear User,\n\nGood news! A volunteer (${volunteerName}) has been assigned to your emergency report: "${incidentTitle}".\n\nThey are on their way. Stay safe.\n\n— Community Impact Team`
    });
  }

  // ── Convenience: notify victim that incident is resolved ──
  async notifyIncidentResolved(
    victimId: string,
    incidentTitle: string,
    volunteerName: string,
    incidentId: string
  ): Promise<void> {
    await this.notify(victimId, {
      type: 'completed',
      title: '✅ Help Has Arrived — Incident Resolved',
      message: `${volunteerName} has completed the mission for "${incidentTitle}". Please rate your experience.`,
      incidentId,
      volunteerName
    });

    this._sendEmailAlert(victimId, {
      subject: 'Community Impact — Incident Resolved',
      body: `Dear User,\n\nYour emergency report "${incidentTitle}" has been resolved by volunteer ${volunteerName}.\n\nPlease rate your experience in the Community Impact app.\n\n— Community Impact Team`
    });
  }

  // ── Mark all notifications read ──────────────────────────
  async markAllRead(userId: string): Promise<void> {
    const notifs = this.notifSubjects.get(userId)?.value || [];
    const unread = notifs.filter(n => !n.read);
    await Promise.all(unread.map(n =>
      updateDoc(doc(this.db, 'notifications', n.id), { read: true })
    ));
  }

  // ── Browser push notification (if permission granted) ────
  private _sendBrowserAlert(notif: AppNotification): void {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notif.title, {
        body: notif.message,
        icon: '/assets/logo.png',
        tag: notif.id
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification(notif.title, { body: notif.message });
        }
      });
    }
  }

  // ── EmailJS client-side email alert ───────────────────────
  // Requires EmailJS account (free) — set keys in environment.ts:
  //   emailjs: { serviceId, templateId, publicKey }
  private _sendEmailAlert(toEmail: string, content: { subject: string; body: string }): void {
    const ejs = (environment as any).emailjs;
    if (!ejs?.serviceId || !ejs?.templateId || !ejs?.publicKey) {
      // EmailJS not configured — skip silently
      console.log('[Notify] EmailJS not configured — skipping email to', toEmail);
      return;
    }

    // Dynamically load EmailJS SDK if not already loaded
    const sendViaEmailJS = () => {
      const emailjs = (window as any).emailjs;
      if (!emailjs) return;
      emailjs.send(ejs.serviceId, ejs.templateId, {
        to_email: toEmail,
        subject: content.subject,
        message: content.body
      }, ejs.publicKey)
        .then(() => console.log('[Notify] Email sent to', toEmail))
        .catch((e: any) => console.warn('[Notify] Email failed:', e));
    };

    if ((window as any).emailjs) {
      sendViaEmailJS();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = sendViaEmailJS;
      document.head.appendChild(script);
    }
  }
}
