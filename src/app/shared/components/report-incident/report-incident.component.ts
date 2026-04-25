
import { Component } from '@angular/core';

import { GeminiService } from '../../../core/services/gemini.service';

import { IncidentService } from '../../../core/services/incident.service';

import { AuthService } from '../../../core/services/auth.service';

import { MatSnackBar } from '@angular/material/snack-bar';

@Component({

  selector: 'app-report-incident',

  templateUrl: './report-incident.component.html',

  styleUrls: ['./report-incident.component.scss']

})

export class ReportIncidentComponent {

  reportText = '';

  isAnalyzing = false;

  isRecording = false;

  imageBase64: string | null = null;

  imagePreviewUrl: string | null = null;

  currentLat: number = 11.0168;

  currentLng: number = 76.9558;

  locationLabel: string = 'Fetching location...';

  constructor(

    private geminiService: GeminiService,

    private incidentService: IncidentService,

    private authService: AuthService,

    private snackBar: MatSnackBar

  ) {

    this.refreshLocation();

  }

  refreshLocation() {

    this.locationLabel = 'Fetching location...';

    if (navigator.geolocation) {

      navigator.geolocation.getCurrentPosition(

        (pos) => {

          this.currentLat = pos.coords.latitude;

          this.currentLng = pos.coords.longitude;

          this.locationLabel = `${this.currentLat.toFixed(4)}, ${this.currentLng.toFixed(4)}`;

        },

        () => { this.locationLabel = 'Location unavailable — using default'; }

      );

    } else {

      this.locationLabel = 'Geolocation not supported';

    }

  }

  onFileSelected(event: any) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e: any) => {

      this.imagePreviewUrl = e.target.result;

      this.imageBase64 = e.target.result.split(',')[1];

      this.isAnalyzing = true;

      try {

        const analysis = await this.geminiService.analyzeIncidentReport('Extract and analyze this incident image.', this.imageBase64!);

        this.reportText = analysis.summary || 'Image analyzed. Please review and add details.';

        this.snackBar.open('Image analyzed!', 'OK', { duration: 2500 });

      } catch {

        this.snackBar.open('OCR failed. Type the details manually.', 'OK', { duration: 3000 });

      } finally { this.isAnalyzing = false; }

    };

    reader.readAsDataURL(file);

  }

  clearImage() { this.imageBase64 = null; this.imagePreviewUrl = null; }

  startVoiceRecording() {

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {

      this.snackBar.open('Voice recognition not supported.', 'OK', { duration: 3000 });

      return;

    }

    const rec = new SpeechRecognition();

    rec.lang = 'en-IN';

    rec.continuous = false;

    rec.interimResults = false;

    this.isRecording = true;

    rec.onresult = (event: any) => { this.reportText = event.results[0][0].transcript; this.isRecording = false; };

    rec.onerror = () => { this.isRecording = false; this.snackBar.open('Voice error. Try again.', 'OK', { duration: 3000 }); };

    rec.onend = () => { this.isRecording = false; };

    rec.start();

    this.snackBar.open('Listening... Speak now.', '', { duration: 3000 });

  }

  async submitReport() {

    if (!this.reportText.trim()) return;

    this.isAnalyzing = true;

    // ✅ Use actual logged-in user's email as victimId

    const victimId = this.authService.getUserId();

    try {

      let analysis: any = { summary: this.reportText, severity: 'Medium', type: 'Other' };

      try {

        const result = await this.geminiService.analyzeIncidentReport(this.reportText, this.imageBase64 || undefined);

        if (result?.summary) analysis = result;

      } catch (e) { console.warn('Gemini failed, using defaults:', e); }

      await this.incidentService.createIncident({

        title: analysis.summary || this.reportText.substring(0, 60),

        description: this.reportText,

        urgency: analysis.severity || 'Medium',

        type: analysis.type || 'Other',

        status: 'pending',

        timestamp: new Date().toISOString(),

        latitude: this.currentLat,

        longitude: this.currentLng,

        victimId  // ✅ actual user id

      });

      this.snackBar.open('✅ Report submitted! Help is on the way.', 'OK', {

        duration: 5000, panelClass: ['success-snackbar']

      });

      this.reportText = '';

      this.imageBase64 = null;

      this.imagePreviewUrl = null;

    } catch (error: any) {

      console.error('Submission Error:', error);

      if (error?.code === 'permission-denied') {

        this.snackBar.open('Permission denied. Please log in again.', 'Close', { duration: 5000 });

      } else {

        this.snackBar.open('Submission failed. Please try again.', 'Close', { duration: 4000 });

      }

    } finally { this.isAnalyzing = false; }

  }

}
