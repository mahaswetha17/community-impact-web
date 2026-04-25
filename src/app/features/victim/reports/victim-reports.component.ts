// src/app/features/victim/reports/victim-reports.component.ts
// FIX: Added volunteer rating (1–5 stars) after incident is completed.
// FIX: Shows in-app notification alerts from NotificationService.

import { Component, OnInit } from '@angular/core';
import { IncidentService } from '../../../core/services/incident.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { Incident } from '../../../models/incident.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-victim-reports',
  templateUrl: './victim-reports.component.html',
  styleUrls: ['./victim-reports.component.scss']
})
export class VictimReportsComponent implements OnInit {
  myReports: Incident[] = [];
  notifications: AppNotification[] = [];

  // Rating state
  ratingPanelOpenId: string | null = null;
  ratingValue: number = 0;
  ratingComment: string = '';
  isSubmittingRating = false;

  // Directions: ask browser location to build navigation link
  myLat: number | null = null;
  myLng: number | null = null;

  currentUserEmail: string = '';

  constructor(
    private incidentService: IncidentService,
    private authService: AuthService,
    public notifService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const victimId = this.authService.getUserId();
    const user = this.authService.getCurrentUser();
    this.currentUserEmail = user?.email || '';

    this.incidentService.getIncidentsByVictim(victimId).subscribe(r => {
      this.myReports = r;
    });

    // Subscribe to in-app notifications
    if (this.currentUserEmail) {
      this.notifService.listenForUser(this.currentUserEmail);
      this.notifService.getNotifications().subscribe(n => {
        this.notifications = n;
      });
    }

    // Get user location for directions link
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        this.myLat = pos.coords.latitude;
        this.myLng = pos.coords.longitude;
      });
    }
  }

  // ── Rating ─────────────────────────────────────────────
  openRating(incidentId: string) {
    this.ratingPanelOpenId = this.ratingPanelOpenId === incidentId ? null : incidentId;
    this.ratingValue = 0;
    this.ratingComment = '';
  }

  hasAlreadyRated(incident: Incident): boolean {
    return (incident.reviews || []).some(r => r.victimId === this.currentUserEmail);
  }

  setRating(val: number) {
    this.ratingValue = val;
  }

  async submitRating(incident: Incident) {
    if (!this.ratingValue) {
      this.snackBar.open('Please select a star rating before submitting.', 'OK', { duration: 3000 });
      return;
    }
    if (!incident.id) return;
    this.isSubmittingRating = true;
    try {
      await this.incidentService.addReview(incident.id, {
        victimId: this.currentUserEmail,
        rating: this.ratingValue,
        comment: this.ratingComment.trim(),
        createdAt: new Date().toISOString()
      });
      this.snackBar.open('Thank you for your rating! ⭐', 'OK', { duration: 3000 });
      this.ratingPanelOpenId = null;
    } catch {
      this.snackBar.open('Failed to submit rating. Please try again.', 'OK', { duration: 3000 });
    } finally {
      this.isSubmittingRating = false;
    }
  }

  // ── Directions ─────────────────────────────────────────
  getDirectionsUrl(incident: Incident): string {
    const dest = `${incident.latitude},${incident.longitude}`;
    if (this.myLat && this.myLng) {
      return `https://www.google.com/maps/dir/${this.myLat},${this.myLng}/${dest}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }

  // ── Notifications ──────────────────────────────────────
  markNotifRead(notif: AppNotification) {
    this.notifService.markRead(this.currentUserEmail, notif.id);
  }

  markAllRead() {
    this.notifService.markAllRead(this.currentUserEmail);
  }

  getNotifIcon(type: string): string {
    if (type === 'volunteer_assigned') return 'directions_run';
    if (type === 'incident_completed') return 'check_circle';
    return 'notifications';
  }

  getNotifColor(type: string): string {
    if (type === 'volunteer_assigned') return '#f57c00';
    if (type === 'incident_completed') return '#388e3c';
    return '#1976d2';
  }

  // ── Utility ────────────────────────────────────────────
  getStatusColor(s: string): string { return s === 'completed' ? '#388e3c' : s === 'assigned' ? '#f57c00' : '#d32f2f'; }
  getStatusLabel(s: string): string { return s === 'completed' ? 'Help Arrived' : s === 'assigned' ? 'Volunteer En Route' : 'Awaiting Response'; }
  getStatusIcon(s: string): string { return s === 'completed' ? 'check_circle' : s === 'assigned' ? 'directions_run' : 'hourglass_empty'; }
  getUrgencyColor(u: string): string { const m: any = { Critical: '#d32f2f', High: '#f57c00', Medium: '#fbc02d', Low: '#388e3c' }; return m[u] || '#388e3c'; }
  getUrgencyBg(u: string): string { const m: any = { Critical: 'linear-gradient(135deg,#ef5350,#c62828)', High: 'linear-gradient(135deg,#ffa726,#e65100)', Medium: 'linear-gradient(135deg,#ffee58,#f9a825)', Low: 'linear-gradient(135deg,#66bb6a,#2e7d32)' }; return m[u] || m['Low']; }

  getExistingRating(incident: Incident): number {
    return (incident.reviews || []).find(r => r.victimId === this.currentUserEmail)?.rating || 0;
  }
}
