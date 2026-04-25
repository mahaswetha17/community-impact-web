
import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { VolunteerService } from '../../../core/services/volunteer.service';

import { MatSnackBar } from '@angular/material/snack-bar';

@Component({

  selector: 'app-profile',

  templateUrl: './profile.component.html',

  styleUrls: ['./profile.component.scss']

})

export class ProfileComponent implements OnInit {

  activeTab: string = 'general';

  roleLabel: string = 'User';

  // Profile data fields

  profileData: any = {

    displayName: '', email: '', gender: '', nationality: '',

    qualification: '', phone: '', address: '', location: '',

    emergencyContact: '', reportsCount: 0, missionsCount: 0, impactScore: 0

  };

  // Edit state per field

  editing: any = {

    displayName: false, gender: false, qualification: false,

    phone: false, address: false, location: false, emergencyContact: false

  };

  // Temp values while editing

  editValues: any = {};

  // Change password fields
  showPasswordForm = false;
  isChangingPassword = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';

  // Notification toggles

  showNotifPanel = false;

  notifSettings: { [key: string]: boolean } = {

    emailAlerts: true,

    smsAlerts: false,

    incidentUpdates: true,

    weeklyReport: false

  };

  // Privacy toggles

  showPrivacyPanel = false;

  privacySettings: { [key: string]: boolean } = {

    showLocation: true,

    showContact: false,

    allowDataSharing: true

  };

  avatarUrl: string | null = null;

  recentActivity: any[] = [];

  constructor(

    private router: Router,

    private authService: AuthService,

    private volunteerService: VolunteerService,

    private snackBar: MatSnackBar

  ) {}

  async ngOnInit() {

    const role = this.authService.getUserRole();

    this.roleLabel = role === 'ngo' ? 'NGO Admin' : role === 'volunteer' ? 'Volunteer' : 'Victim / User';

    const user = this.authService.getCurrentUser();

    

    // Load profile data from Firestore

    const savedProfile = await this.authService.getProfileData();

    this.avatarUrl = localStorage.getItem('userAvatar_' + (user?.email || ''));

    const savedPrivacy = localStorage.getItem('userPrivacy_' + (user?.email || ''));

    if (savedPrivacy) this.privacySettings = JSON.parse(savedPrivacy);

    this.profileData = {

      displayName: user?.displayName || savedProfile.displayName || '',

      email: user?.email || savedProfile.email || '',

      gender: savedProfile.gender || '',

      nationality: savedProfile.nationality || '',

      qualification: savedProfile.qualification || '',

      phone: savedProfile.phone || '',

      address: savedProfile.address || '',

      location: savedProfile.location || '',

      emergencyContact: savedProfile.emergencyContact || '',

      reportsCount: savedProfile.reportsCount || 0,

      missionsCount: savedProfile.missionsCount || 0,

      impactScore: savedProfile.impactScore || 0

    };

    this.recentActivity = [

      { icon: 'login', type: 'report', description: 'Logged into Community Impact', time: 'Just now' },

      { icon: 'account_circle', type: 'mission', description: 'Profile viewed', time: 'Today' },

    ];

  }

  // ── Field Editing ────────────────────────────────────────

  startEdit(field: string) {

    this.editing[field] = true;

    this.editValues[field] = this.profileData[field];

  }

  cancelEdit(field: string) {

    this.editing[field] = false;

    delete this.editValues[field];

  }

  saveField(field: string) {

    this.profileData[field] = this.editValues[field];

    this.editing[field] = false;

    this.authService.updateProfile({ [field]: this.editValues[field] });

    // If volunteer updated their location, sync to volunteer registry

    if (field === 'location' || field === 'displayName') {

      const email = this.profileData.email;

      this.volunteerService.updateVolunteerProfile(email, {

        displayName: this.profileData.displayName,

        location: this.profileData.location

      });

    }

    this.snackBar.open('Profile updated successfully!', 'OK', { duration: 2500 });

  }

  // ── Change Password ───────────────────────────────────────

  togglePasswordForm() {

    this.showPasswordForm = !this.showPasswordForm;

    this.showNotifPanel = false;

    this.showPrivacyPanel = false;

    this.currentPassword = '';

    this.newPassword = '';

    this.confirmNewPassword = '';

  }

  // FIX: changePassword now calls authService.changePassword() which:
  //  1. Fetches the user document from Firestore
  //  2. Verifies currentPassword against the stored bcrypt hash
  //  3. bcrypt-hashes the new password (salt rounds = 10)
  //  4. Writes the new passwordHash to Firestore immediately (real-time)
  async changePassword() {
    if (!this.currentPassword) {
      this.snackBar.open('Please enter your current password.', 'OK', { duration: 3000 });
      return;
    }

    if (!this.newPassword || this.newPassword.length < 6) {
      this.snackBar.open('New password must be at least 6 characters.', 'OK', { duration: 3000 });
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.snackBar.open('Passwords do not match.', 'OK', { duration: 3000 });
      return;
    }

    this.isChangingPassword = true;
    try {
      await this.authService.changePassword(this.currentPassword, this.newPassword);
      this.snackBar.open('Password changed successfully!', 'OK', { duration: 3000 });
      this.showPasswordForm = false;
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    } catch (err: any) {
      this.snackBar.open(err.message || 'Failed to change password. Please try again.', 'OK', { duration: 4000 });
    } finally {
      this.isChangingPassword = false;
    }
  }

  // ── Notification Settings ────────────────────────────────

  toggleNotifPanel() {

    this.showNotifPanel = !this.showNotifPanel;

    this.showPasswordForm = false;

    this.showPrivacyPanel = false;

  }

  saveNotifSettings() {

    localStorage.setItem('ci_notif_settings', JSON.stringify(this.notifSettings));

    this.snackBar.open('Notification preferences saved!', 'OK', { duration: 2500 });

    this.showNotifPanel = false;

  }

  // ── Privacy Settings ─────────────────────────────────────

  togglePrivacyPanel() {

    this.showPrivacyPanel = !this.showPrivacyPanel;

    this.showNotifPanel = false;

    this.showPasswordForm = false;

  }

  savePrivacySettings() {

    const user = this.authService.getCurrentUser();

    localStorage.setItem('userPrivacy_' + (user?.email || ''), JSON.stringify(this.privacySettings));

    this.snackBar.open('Privacy settings updated!', 'OK', { duration: 2500 });

    this.showPrivacyPanel = false;

  }

  // ── Profile Photo ────────────────────────────────────────

  onPhotoSelected(event: any) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {

      this.avatarUrl = e.target.result;

      const user = this.authService.getCurrentUser();

      localStorage.setItem('userAvatar_' + (user?.email || ''), this.avatarUrl!);

      this.snackBar.open('Profile picture updated!', 'OK', { duration: 2500 });

    };

    reader.readAsDataURL(file);

  }

  // ── Sign Out ─────────────────────────────────────────────

  onSignOut() {

    this.authService.logout();

  }

}
