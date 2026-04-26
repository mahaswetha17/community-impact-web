import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IncidentService } from '../../../core/services/incident.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface RatingDialogData {
  incidentId: string;
  volunteerName: string;
  volunteerId: string;
}

@Component({
  selector: 'app-rating-dialog',
  templateUrl: './rating-dialog.component.html',
  styleUrls: ['./rating-dialog.component.scss']
})
export class RatingDialogComponent {
  selectedRating = 0;
  comment = '';
  isSubmitting = false;

  readonly labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  get ratingLabel(): string { return this.labels[this.selectedRating] || ''; }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RatingDialogData,
    private dialogRef: MatDialogRef<RatingDialogComponent>,
    private incidentService: IncidentService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  async submitRating() {
    if (this.selectedRating === 0) return;
    this.isSubmitting = true;
    try {
      await this.incidentService.addReview(this.data.incidentId, {
        rating: this.selectedRating,
        comment: this.comment.trim(),
        victimId: this.authService.getUserId(),
        createdAt: new Date().toISOString()
      });
      this.snackBar.open('✅ Thank you for your feedback!', 'OK', { duration: 3000 });
      this.dialogRef.close({ submitted: true, rating: this.selectedRating });
    } catch (e) {
      this.snackBar.open('Failed to submit rating. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  close() { this.dialogRef.close({ submitted: false }); }
}
