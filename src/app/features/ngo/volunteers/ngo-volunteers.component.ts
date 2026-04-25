
// src/app/features/ngo/volunteers/ngo-volunteers.component.ts

// Fixes: label overlap, AI distance-based suggestions, mission history display

import { Component, OnInit } from '@angular/core';

import { VolunteerService, VolunteerProfile } from '../../../core/services/volunteer.service';

import { IncidentService } from '../../../core/services/incident.service';

import { Incident, AssignmentHistory } from '../../../models/incident.model';

import { MatSnackBar } from '@angular/material/snack-bar';

interface VolunteerWithDistance extends VolunteerProfile {

  distanceKm?: number;

  isBestMatch?: boolean;

}

@Component({

  selector: 'app-ngo-volunteers',

  templateUrl: './ngo-volunteers.component.html',

  styleUrls: ['./ngo-volunteers.component.scss']

})

export class NgoVolunteersComponent implements OnInit {

  volunteers: VolunteerProfile[] = [];

  pendingIncidents: Incident[] = [];

  searchQuery = '';

  showAssignModal = false;

  selectedVol: VolunteerProfile | null = null;

  showHistoryModal = false;

  historyVol: VolunteerProfile | null = null;

  suggestedIncidents: (Incident & { distanceKm?: number })[] = [];

  get availableCount() { return this.volunteers.filter(v => v.status === 'available').length; }

  get assignedCount() { return this.volunteers.filter(v => v.status === 'assigned').length; }

  get filteredVolunteers(): VolunteerProfile[] {

    if (!this.searchQuery.trim()) return this.volunteers;

    const q = this.searchQuery.toLowerCase();

    return this.volunteers.filter(v =>

      v.displayName.toLowerCase().includes(q) || v.email.toLowerCase().includes(q)

    );

  }

  constructor(

    private volunteerService: VolunteerService,

    private incidentService: IncidentService,

    private snackBar: MatSnackBar

  ) { }

  ngOnInit() {

    this.volunteerService.getVolunteers().subscribe(vols => {

      this.volunteers = vols;

    });

    this.incidentService.getActiveIncidents().subscribe(incidents => {

      this.pendingIncidents = incidents.filter(i => i.status === 'pending' || i.status === 'active');

    });

  }

  openAssignModal(vol: VolunteerProfile) {

    this.selectedVol = vol;

    // Sort incidents by distance to this volunteer

    this.suggestedIncidents = this._rankIncidentsByDistance(vol);

    this.showAssignModal = true;

  }

  closeModal() {

    this.showAssignModal = false;

    this.selectedVol = null;

    this.suggestedIncidents = [];

  }

  openHistoryModal(vol: VolunteerProfile) {

    this.historyVol = vol;

    this.showHistoryModal = true;

  }

  closeHistoryModal() {

    this.showHistoryModal = false;

    this.historyVol = null;

  }

  async confirmAssign(incident: Incident) {

    if (!this.selectedVol || !incident.id) return;

    try {

      await this.incidentService.assignVolunteer(

        incident.id, this.selectedVol.id, this.selectedVol.displayName

      );

      await this.volunteerService.updateVolunteerStatus(this.selectedVol.id, 'assigned');

      this.snackBar.open(

        `✅ ${this.selectedVol.displayName} assigned to "${incident.title}"`,

        'OK', { duration: 4000 }

      );

      this.closeModal();

    } catch {

      this.snackBar.open('Assignment failed. Try again.', 'OK', { duration: 3000 });

    }

  }

  // ── Sort incidents by proximity to volunteer ─────────────

  private _rankIncidentsByDistance(vol: VolunteerProfile): (Incident & { distanceKm?: number })[] {

    const { lat: vLat, lng: vLng } = this._parseVolunteerLocation(vol);

    return this.pendingIncidents

      .map(inc => {

        const distanceKm = vLat && vLng

          ? IncidentService.haversineKm(vLat, vLng, inc.latitude, inc.longitude)

          : undefined;

        return { ...inc, distanceKm };

      })

      .sort((a, b) => {

        if (a.distanceKm == null && b.distanceKm == null) return 0;

        if (a.distanceKm == null) return 1;

        if (b.distanceKm == null) return -1;

        return a.distanceKm - b.distanceKm;

      });

  }

  private _parseVolunteerLocation(vol: VolunteerProfile): { lat: number | null, lng: number | null } {

    if (!vol.location) return { lat: null, lng: null };

    const parts = vol.location.split(',');

    if (parts.length === 2) {

      const lat = parseFloat(parts[0]);

      const lng = parseFloat(parts[1]);

      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };

    }

    const locationMap: Record<string, { lat: number, lng: number }> = {

      'chennai south': { lat: 12.9279, lng: 80.1270 },

      'anna nagar': { lat: 13.0891, lng: 80.2104 },

      'adyar': { lat: 13.0012, lng: 80.2565 },

      't nagar': { lat: 13.0418, lng: 80.2341 },

      'velachery': { lat: 12.9815, lng: 80.2180 },

      'tambaram': { lat: 12.9229, lng: 80.1275 },

      'porur': { lat: 13.0333, lng: 80.1574 },

      'omr': { lat: 12.8995, lng: 80.2264 },

    };

    return locationMap[vol.location.trim().toLowerCase()] || { lat: null, lng: null };

  }

  getUrgencyColor(urgency: string): string {

    const map: any = { Critical: '#d32f2f', High: '#f57c00', Medium: '#fbc02d', Low: '#388e3c' };

    return map[urgency] || '#388e3c';

  }

}
