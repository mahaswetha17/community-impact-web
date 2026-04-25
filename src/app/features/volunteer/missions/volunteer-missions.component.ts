// src/app/features/volunteer/missions/volunteer-missions.component.ts
//
// ROOT CAUSE FIX: The volunteer dashboard showed "0 Active Missions" because:
//   - NGO dashboard stored volunteerId = vol.id  (uid like "uid-1234-abc")
//   - getUserId() returns userEmail from localStorage (e.g. "vol@gmail.com")
//   - The filter i.volunteerId === volId compared uid vs email → NEVER matched
//
// THE FIX (applied in ngo-dashboard + volunteer.service):
//   - assignVolunteer() now passes vol.email as volunteerId
//   - addMissionToHistory() + getVolunteerById() match by email OR id
//   - This component now filters by email (getUserId() = userEmail) correctly
//
// ALSO: Full Google Maps directions integration with live GPS + embedded map preview.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IncidentService } from '../../../core/services/incident.service';
import { AuthService } from '../../../core/services/auth.service';
import { Incident } from '../../../models/incident.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-volunteer-missions',
  templateUrl: './volunteer-missions.component.html',
  styleUrls: ['./volunteer-missions.component.scss']
})
export class VolunteerMissionsComponent implements OnInit, OnDestroy {
  missions: Incident[] = [];
  completedMissions: Incident[] = [];
  isCompleting = false;

  // Volunteer's own email — used as volunteerId (the unified key after the fix)
  volEmail: string = '';

  // Current GPS position of the volunteer for accurate directions
  myLat: number | null = null;
  myLng: number | null = null;
  locationError: string = '';

  private sub?: Subscription;

  constructor(
    private incidentService: IncidentService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // getUserId() returns userEmail — this is the volunteerId stored in Firestore
    this.volEmail = this.authService.getUserId();

    // Real-time subscription: updates instantly when NGO assigns this volunteer
    this.sub = this.incidentService.getActiveIncidents().subscribe(all => {
      // Filter by email match (volunteerId is now the volunteer's email)
      this.missions = all.filter(
        i => i.volunteerId === this.volEmail && i.status === 'assigned'
      );
      this.completedMissions = all.filter(
        i => i.volunteerId === this.volEmail && i.status === 'completed'
      );
    });

    // Get volunteer's live GPS for accurate turn-by-turn directions
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.myLat = pos.coords.latitude;
          this.myLng = pos.coords.longitude;
        },
        () => {
          this.locationError = 'Location access denied — directions will use your location in Google Maps.';
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  async markServed(incident: Incident) {
    if (!incident.id) return;
    this.isCompleting = true;
    try {
      await this.incidentService.markCompleted(incident.id);
      this.snackBar.open('✅ Mission completed! Great work. The victim has been notified.', 'OK', { duration: 4000 });
    } catch {
      this.snackBar.open('Failed to update. Try again.', 'OK', { duration: 3000 });
    } finally {
      this.isCompleting = false;
    }
  }

  // Open Google Maps with live GPS as origin → incident coords as destination
  openDirections(inc: Incident): void {
    let url: string;
    if (this.myLat && this.myLng) {
      url = `https://www.google.com/maps/dir/${this.myLat},${this.myLng}/${inc.latitude},${inc.longitude}?travelmode=driving`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}&travelmode=driving`;
    }
    window.open(url, '_blank');
  }

  // Sanitized embed URL for the map preview iframe
  getMapEmbedUrl(inc: Incident): SafeResourceUrl {
    const url = `https://www.google.com/maps?q=${inc.latitude},${inc.longitude}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getDistanceLabel(inc: Incident): string {
    if (this.myLat === null || this.myLng === null) return '';
    const km = IncidentService.haversineKm(this.myLat, this.myLng, inc.latitude, inc.longitude);
    return `${km.toFixed(1)} km away`;
  }

  getDirectionsUrl(inc: Incident): string {
    if (this.myLat && this.myLng) {
      return `https://www.google.com/maps/dir/${this.myLat},${this.myLng}/${inc.latitude},${inc.longitude}?travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}&travelmode=driving`;
  }

  getUrgencyColor(u: string): string {
    const m: any = { Critical: '#d32f2f', High: '#f57c00', Medium: '#fbc02d', Low: '#388e3c' };
    return m[u] || '#388e3c';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
