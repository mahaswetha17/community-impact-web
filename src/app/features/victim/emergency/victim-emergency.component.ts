
import { Component } from '@angular/core';

@Component({

  selector: 'app-victim-emergency',

  template: `

    <div class="app-shell">

      <app-sidebar></app-sidebar>

      <div class="main-panel">

        <app-navbar></app-navbar>

        <div class="page-content">

          <div class="page-heading">

            <div>

              <h1 class="page-title">Emergency <span>Help</span></h1>

              <p class="page-subtitle">Report an emergency and get immediate assistance.</p>

            </div>

          </div>

          <div class="alert-banner" style="display:flex;align-items:flex-start;gap:14px;padding:16px 20px;background:#fff8e1;border-left:4px solid #ffc107;border-radius:14px;margin-bottom:24px">

            <mat-icon style="color:#f57c00;font-size:22px;height:22px;width:22px;margin-top:2px">warning</mat-icon>

            <div>

              <strong style="color:#e65100;font-size:14px">Life-threatening emergency?</strong>

              <p style="margin:4px 0 0;font-size:13px;color:#bf360c">Call <strong>112</strong> immediately. Use the form below for additional support.</p>

            </div>

          </div>

          <app-report-incident></app-report-incident>

        </div>

      </div>

    </div>`,

  styles: ['.page-heading { margin-bottom: 28px; }']

})

export class VictimEmergencyComponent {}
