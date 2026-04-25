
// src/app/features/ngo/dashboard/ngo-dashboard.component.ts

// AI-assisted volunteer assignment based on location proximity (Haversine distance).

// Volunteers are sorted by distance to the incident location and suggested accordingly.

import { Component, OnInit } from '@angular/core';

import { IncidentService } from '../../../core/services/incident.service';

import { VolunteerService, VolunteerProfile } from '../../../core/services/volunteer.service';

import { GeminiService } from '../../../core/services/gemini.service';

import { Incident } from '../../../models/incident.model';

import { MatSnackBar } from '@angular/material/snack-bar';

interface VolunteerWithDistance extends VolunteerProfile {

  distanceKm?: number;

  isBestMatch?: boolean;

}

@Component({

  selector: 'app-ngo-dashboard',

  templateUrl: './ngo-dashboard.component.html',

  styleUrls: ['./ngo-dashboard.component.scss']

})

export class NgoDashboardComponent implements OnInit {

  incidents: Incident[] = [];

  volunteers: VolunteerProfile[] = [];

  showVolunteerPicker = false;

  selectedIncident: Incident | null = null;

  suggestedVolunteers: VolunteerWithDistance[] = [];

  isAutoAssigning = false;

  mapCenter: google.maps.LatLngLiteral = { lat: 13.0827, lng: 80.2707 }; // Chennai default

  zoom = 11;

  mapOptions: google.maps.MapOptions = {

    styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]

  };

  get activeCount() { return this.incidents.filter(i => i.status === 'active' || i.status === 'pending').length; }

  get assignedCount() { return this.incidents.filter(i => i.status === 'assigned').length; }

  get criticalCount() { return this.incidents.filter(i => i.urgency === 'Critical').length; }

  get resolvedCount() { return this.incidents.filter(i => i.status === 'completed').length; }

  get availableVolunteers() { return this.volunteers.filter(v => v.status === 'available'); }

  constructor(

    private incidentService: IncidentService,

    private volunteerService: VolunteerService,

    private geminiService: GeminiService,

    private snackBar: MatSnackBar

  ) { }

  ngOnInit() {

    this.incidentService.getActiveIncidents().subscribe(data => { this.incidents = data; });

    this.volunteerService.getVolunteers().subscribe(vols => { this.volunteers = vols; });

  }

  openVolunteerPicker(incident: Incident) {

    if (incident.status === 'assigned') return;

    this.selectedIncident = incident;

    // Sort available volunteers by distance to incident

    this.suggestedVolunteers = this._rankVolunteersByDistance(incident);

    this.showVolunteerPicker = true;

  }

  closeVolunteerPicker() {

    this.showVolunteerPicker = false;

    this.selectedIncident = null;

    this.suggestedVolunteers = [];

  }

  async pickVolunteer(vol: VolunteerProfile) {

    if (!this.selectedIncident?.id) return;

    try {

      // FIX: use vol.email as volunteerId so it matches getUserId() which
      // returns localStorage('userEmail'). Previously vol.id (uid) was used,
      // causing volunteer dashboard filter to never match and show 0 missions.
      await this.incidentService.assignVolunteer(

        this.selectedIncident.id, vol.email, vol.displayName

      );

      await this.volunteerService.updateVolunteerStatus(vol.id, 'assigned');

      this.snackBar.open(

        `✅ ${vol.displayName} assigned to "${this.selectedIncident.title}"`,

        'OK', { duration: 4000 }

      );

      this.closeVolunteerPicker();

    } catch {

      this.snackBar.open('Assignment failed. Try again.', 'OK', { duration: 3000 });

    }

  }

  // ── AI Auto-Assign: picks closest available volunteer ────

  async autoAssign(incident: Incident) {

    if (!incident.id) return;

    const available = this.volunteers.filter(v => v.status === 'available');

    if (!available.length) {

      this.snackBar.open('No available volunteers at the moment.', 'OK', { duration: 3000 });

      return;

    }

    this.isAutoAssigning = true;

    this.snackBar.open('🤖 AI is finding the nearest volunteer...', '', { duration: 2500 });

    try {

      const ranked = this._rankVolunteersByDistance(incident);

      const bestVol = ranked[0]; // closest

      // FIX: use bestVol.email as volunteerId (same as getUserId() = userEmail)
      await this.incidentService.assignVolunteer(incident.id, bestVol.email, bestVol.displayName);

      await this.volunteerService.updateVolunteerStatus(bestVol.id, 'assigned');

      const distInfo = bestVol.distanceKm != null

        ? ` (${bestVol.distanceKm.toFixed(1)} km away)`

        : '';

      this.snackBar.open(

        `✅ ${bestVol.displayName} auto-assigned${distInfo}!`,

        'OK', { duration: 4000 }

      );

    } catch {

      this.snackBar.open('Auto-assign failed.', 'OK', { duration: 3000 });

    } finally {

      this.isAutoAssigning = false;

    }

  }

  // ── Rank available volunteers by Haversine distance ──────

  private _rankVolunteersByDistance(incident: Incident): VolunteerWithDistance[] {

    const available = this.volunteers.filter(v => v.status === 'available');

    const ranked: VolunteerWithDistance[] = available.map(v => {

      // Parse lat/lng from volunteer's stored location string or default

      const { lat, lng } = this._parseVolunteerLocation(v);

      const distanceKm = lat && lng

        ? IncidentService.haversineKm(incident.latitude, incident.longitude, lat, lng)

        : undefined;

      return { ...v, distanceKm };

    });

    // Sort: volunteers with known distance first (ascending), unknown last

    ranked.sort((a, b) => {

      if (a.distanceKm == null && b.distanceKm == null) return 0;

      if (a.distanceKm == null) return 1;

      if (b.distanceKm == null) return -1;

      return a.distanceKm - b.distanceKm;

    });

    if (ranked.length > 0) ranked[0].isBestMatch = true;

    return ranked;

  }

  // ── Parse volunteer location string to lat/lng ───────────

  // Volunteers can store "lat,lng" or a named location. 

  // Named locations are mapped for Chennai (extend as needed).

  private _parseVolunteerLocation(vol: VolunteerProfile): { lat: number | null, lng: number | null } {

    if (!vol.location) return { lat: null, lng: null };

    // Try "lat,lng" format first

    const parts = vol.location.split(',');

    if (parts.length === 2) {

      const lat = parseFloat(parts[0]);

      const lng = parseFloat(parts[1]);

      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };

    }

    // Chennai area named locations fallback

    const locationMap: Record<string, { lat: number, lng: number }> = {

      'chennai south': { lat: 12.9279, lng: 80.1270 },

      'anna nagar': { lat: 13.0891, lng: 80.2104 },

      'adyar': { lat: 13.0012, lng: 80.2565 },

      't nagar': { lat: 13.0418, lng: 80.2341 },

      'velachery': { lat: 12.9815, lng: 80.2180 },

      'tambaram': { lat: 12.9229, lng: 80.1275 },

      'porur': { lat: 13.0333, lng: 80.1574 },

      'omr': { lat: 12.8995, lng: 80.2264 },

      'perambur': { lat: 13.1178, lng: 80.2330 },

      'royapettah': { lat: 13.0535, lng: 80.2633 }

    };

    const key = vol.location.trim().toLowerCase();

    return locationMap[key] || { lat: null, lng: null };

  }

  getMarkerOptions(urgency: string): google.maps.MarkerOptions {

    const color = urgency === 'Critical' ? 'red' : urgency === 'High' ? 'orange' : 'yellow';

    return { icon: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png` };

  }

  getUrgencyColor(urgency: string): string {

    const map: any = { Critical: '#d32f2f', High: '#f57c00', Medium: '#fbc02d', Low: '#388e3c' };

    return map[urgency] || '#388e3c';

  }

}
