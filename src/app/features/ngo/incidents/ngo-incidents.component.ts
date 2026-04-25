
import { Component, OnInit } from '@angular/core';

import { IncidentService } from '../../../core/services/incident.service';

import { Incident } from '../../../models/incident.model';

import { MatSnackBar } from '@angular/material/snack-bar';

@Component({

  selector: 'app-ngo-incidents',

  templateUrl: './ngo-incidents.component.html',

  styleUrls: ['./ngo-incidents.component.scss']

})

export class NgoIncidentsComponent implements OnInit {

  incidents: Incident[] = [];

  filter: string = 'all';

  get filtered(): Incident[] {

    if (this.filter === 'all') return this.incidents;

    return this.incidents.filter(i => i.status === this.filter);

  }

  constructor(private incidentService: IncidentService, private snackBar: MatSnackBar) {}

  ngOnInit() {

    this.incidentService.getActiveIncidents().subscribe(data => { this.incidents = data; });

  }

  async markCompleted(id: string) {

    await this.incidentService.markCompleted(id);

    this.snackBar.open('Incident resolved.', 'OK', { duration: 3000 });

  }

  getUrgencyColor(u: string): string {

    const m: any = { Critical: '#d32f2f', High: '#f57c00', Medium: '#fbc02d', Low: '#388e3c' };

    return m[u] || '#388e3c';

  }

}
