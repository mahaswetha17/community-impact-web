
import { Component, OnInit } from '@angular/core';

import { IncidentService } from '../../../core/services/incident.service';

import { Incident } from '../../../models/incident.model';

@Component({

  selector: 'app-ngo-reports',

  template: `

    <div class="app-shell">

      <app-sidebar></app-sidebar>

      <div class="main-panel">

        <app-navbar></app-navbar>

        <div class="page-content">

          <div style="margin-bottom:28px">

            <h1 class="page-title">Analytics & <span>Reports</span></h1>

            <p class="page-subtitle">Overview of all incidents and volunteer activities.</p>

          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px">

            <div *ngFor="let s of stats" style="background:white;border-radius:16px;padding:22px;border:1px solid rgba(46,125,50,.08);box-shadow:0 2px 10px rgba(46,125,50,.05);text-align:center">

              <div style="font-size:36px;font-weight:800;color:#2e7d32">{{ s.value }}</div>

              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8aaa8a;margin-top:4px">{{ s.label }}</div>

            </div>

          </div>

          <div style="background:white;border-radius:20px;padding:24px;border:1px solid rgba(46,125,50,.08);box-shadow:0 2px 12px rgba(46,125,50,.06)">

            <h2 style="font-size:18px;font-weight:700;margin:0 0 20px">All Reports</h2>

            <div *ngFor="let inc of incidents" style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;background:#f9fffe;border:1px solid rgba(46,125,50,.08);margin-bottom:10px">

              <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;color:white" [style.background]="getColor(inc.urgency)">{{ inc.urgency }}</span>

              <div style="flex:1"><strong style="font-size:14px;color:#1a2a1a">{{ inc.title }}</strong><br><span style="font-size:12px;color:#8aaa8a">{{ inc.type }} · {{ inc.timestamp | date:'short' }}</span></div>

              <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px" [ngClass]="inc.status" style="text-transform:capitalize">{{ inc.status }}</span>

            </div>

            <div *ngIf="incidents.length===0" style="text-align:center;padding:48px;color:#8aaa8a">No incidents yet.</div>

          </div>

        </div>

      </div>

    </div>`,

  styles: ['.pending{background:rgba(244,67,54,.1);color:#c62828} .assigned{background:rgba(33,150,243,.1);color:#1565c0} .completed{background:rgba(76,175,80,.1);color:#2e7d32} .active{background:rgba(255,152,0,.1);color:#e65100}']

})

export class NgoReportsComponent implements OnInit {

  incidents: Incident[] = [];

  get stats() {

    return [

      { label: 'Total Reports', value: this.incidents.length },

      { label: 'Resolved', value: this.incidents.filter(i=>i.status==='completed').length },

      { label: 'Critical', value: this.incidents.filter(i=>i.urgency==='Critical').length },

      { label: 'Assigned', value: this.incidents.filter(i=>i.status==='assigned').length },

    ];

  }

  constructor(private incidentService: IncidentService) {}

  ngOnInit() { this.incidentService.getActiveIncidents().subscribe(d => { this.incidents = d; }); }

  getColor(u: string): string { const m: any={Critical:'#d32f2f',High:'#f57c00',Medium:'#fbc02d',Low:'#388e3c'}; return m[u]||'#388e3c'; }

}
