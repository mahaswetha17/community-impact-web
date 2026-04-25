
import { Component, OnInit } from '@angular/core';

import { IncidentService } from '../../../core/services/incident.service';

import { Incident } from '../../../models/incident.model';

@Component({

  selector: 'app-ngo-map',

  template: `

    <div class="app-shell">

      <app-sidebar></app-sidebar>

      <div class="main-panel">

        <app-navbar></app-navbar>

        <div class="page-content">

          <div style="margin-bottom:28px">

            <h1 class="page-title">Live <span>Incident Map</span></h1>

            <p class="page-subtitle">Real-time geographic view of all active incidents.</p>

          </div>

          <div style="background:white;border-radius:20px;padding:24px;border:1px solid rgba(46,125,50,.08);box-shadow:0 2px 12px rgba(46,125,50,.06)">

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">

              <h2 style="font-size:18px;font-weight:700;color:#1a2a1a;margin:0">Full Screen Map</h2>

              <span class="live-badge"><span class="live-dot"></span> Live</span>

            </div>

            <div style="border-radius:16px;overflow:hidden;border:2px solid rgba(46,125,50,.1)">

              <google-map height="600px" width="100%" [center]="mapCenter" [zoom]="zoom" [options]="mapOptions">

                <map-marker *ngFor="let inc of incidents"

                  [position]="{lat: inc.latitude, lng: inc.longitude}"

                  [title]="inc.title"

                  [options]="getMarkerOptions(inc.urgency)">

                </map-marker>

              </google-map>

            </div>

          </div>

        </div>

      </div>

    </div>`,

  styles: []

})

export class NgoMapComponent implements OnInit {

  incidents: Incident[] = [];

  mapCenter: google.maps.LatLngLiteral = { lat: 20.5937, lng: 78.9629 };

  zoom = 5;

  mapOptions: google.maps.MapOptions = { styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }] };

  constructor(private incidentService: IncidentService) {}

  ngOnInit() { this.incidentService.getActiveIncidents().subscribe(d => { this.incidents = d; }); }

  getMarkerOptions(u: string): google.maps.MarkerOptions {

    const c = u === 'Critical' ? 'red' : u === 'High' ? 'orange' : 'yellow';

    return { icon: `http://maps.google.com/mapfiles/ms/icons/${c}-dot.png` };

  }

}
