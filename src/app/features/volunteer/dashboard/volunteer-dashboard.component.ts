// src/app/features/volunteer/dashboard/volunteer-dashboard.component.ts
// FIX: Was using hardcoded 'current-volunteer-id' — now uses authService.getUserId()
// which returns the volunteer's email (the unified volunteerId key).
// Also adds real-time directions from volunteer's live GPS to the incident.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IncidentService } from '../../../core/services/incident.service';
import { AuthService } from '../../../core/services/auth.service';
import { Incident } from '../../../models/incident.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-volunteer-dashboard',
  templateUrl: './volunteer-dashboard.component.html',
  styleUrls: ['./volunteer-dashboard.component.scss']
})
export class VolunteerDashboardComponent implements OnInit, OnDestroy {
  currentLocation: google.maps.LatLngLiteral = { lat: 20.5937, lng: 78.9629 };
  assignedIncident: Incident | null = null;
  activeMissionCount = 0;
  isCompleting = false;

  myLat: number | null = null;
  myLng: number | null = null;

  private sub?: Subscription;

  constructor(
    private incidentService: IncidentService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.trackLocation();

    // FIX: use real volunteer email as id (no more hardcoded 'current-volunteer-id')
    const volEmail = this.authService.getUserId();

    // Real-time subscription — updates the moment NGO assigns this volunteer
    this.sub = this.incidentService.getActiveIncidents().subscribe(all => {
      const myMissions = all.filter(
        i => i.volunteerId === volEmail && i.status === 'assigned'
      );
      this.activeMissionCount = myMissions.length;
      this.assignedIncident = myMissions.length > 0 ? myMissions[0] : null;
    });
  }

  trackLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        this.currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.myLat = pos.coords.latitude;
        this.myLng = pos.coords.longitude;
      }, () => {});
    }
  }

  async markServed() {
    if (!this.assignedIncident?.id) return;
    this.isCompleting = true;
    try {
      await this.incidentService.markCompleted(this.assignedIncident.id);
      this.snackBar.open('✅ Mission marked as completed! Victim has been notified.', 'OK', { duration: 3000 });
      this.assignedIncident = null;
    } catch {
      this.snackBar.open('Failed to update status. Please try again.', 'OK', { duration: 3000 });
    } finally {
      this.isCompleting = false;
    }
  }

  // Full directions URL using live GPS as origin
  getDirectionsUrl(): string {
    if (!this.assignedIncident) return '';
    if (this.myLat && this.myLng) {
      return `https://www.google.com/maps/dir/${this.myLat},${this.myLng}/${this.assignedIncident.latitude},${this.assignedIncident.longitude}?travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${this.assignedIncident.latitude},${this.assignedIncident.longitude}&travelmode=driving`;
  }

  getUrgencyColor(urgency: string): string {
    const map: any = { Critical: '#d32f2f', High: '#f57c00', Medium: '#fbc02d', Low: '#388e3c' };
    return map[urgency] || '#388e3c';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
