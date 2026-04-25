
import { Component } from '@angular/core';

@Component({

  selector: 'app-volunteer-report',

  template: `

    <div class="app-shell">

      <app-sidebar></app-sidebar>

      <div class="main-panel">

        <app-navbar></app-navbar>

        <div class="page-content">

          <div class="page-heading">

            <div>

              <h1 class="page-title">Report <span>Incident</span></h1>

              <p class="page-subtitle">Submit an on-ground incident for AI analysis and NGO action.</p>

            </div>

          </div>

          <app-report-incident></app-report-incident>

        </div>

      </div>

    </div>`,

  styles: ['.page-heading { margin-bottom: 28px; }']

})

export class VolunteerReportComponent {}
