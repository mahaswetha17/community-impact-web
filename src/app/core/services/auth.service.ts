// src/app/core/services/auth.service.ts
// Full Firebase Firestore auth with bcrypt password hashing.
// FIX: Added changePassword() — verifies current password via bcrypt, hashes
// the new password, and persists the new passwordHash to Firestore in real-time.

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore, doc, setDoc, getDoc, updateDoc, collection
} from 'firebase/firestore';
import * as bcrypt from 'bcryptjs';
import { environment } from '../../../environments/environment';

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'ngo' | 'volunteer' | 'victim';
  passwordHash: string;
  phone?: string;
  location?: string;
  gender?: string;
  nationality?: string;
  qualification?: string;
  address?: string;
  emergencyContact?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private app: FirebaseApp;
  private db: Firestore;

  constructor(private router: Router) {
    if (!getApps().length) {
      this.app = initializeApp(environment.firebase);
    } else {
      this.app = getApps()[0];
    }
    this.db = getFirestore(this.app);
  }

  // ── REGISTER ────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    displayName: string,
    role: string,
    extraData?: Partial<UserRecord>
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const userRef = doc(this.db, 'users', normalizedEmail);
    const existing = await getDoc(userRef);
    if (existing.exists()) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = 'uid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const userRecord: UserRecord = {
      uid,
      email: normalizedEmail,
      displayName: displayName.trim(),
      role: role as any,
      passwordHash,
      createdAt: new Date().toISOString(),
      ...extraData
    };

    await setDoc(userRef, userRecord);

    if (role === 'volunteer') {
      const volRef = doc(this.db, 'volunteers', normalizedEmail);
      await setDoc(volRef, {
        id: uid,
        displayName: userRecord.displayName,
        email: normalizedEmail,
        phone: extraData?.phone || '',
        location: extraData?.location || '',
        registeredAt: userRecord.createdAt,
        status: 'available',
        missionHistory: []
      });
    }

    this._setSession(userRecord);
    if (role === 'ngo') this.router.navigate(['/ngo/dashboard']);
    else if (role === 'volunteer') this.router.navigate(['/volunteer/dashboard']);
    else this.router.navigate(['/victim/dashboard']);
  }

  // ── LOGIN ───────────────────────────────────────────────

  async login(email: string, password: string, role: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const userRef = doc(this.db, 'users', normalizedEmail);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      throw new Error('No account found with this email. Please sign up first.');
    }

    const userRecord = snap.data() as UserRecord;

    if (userRecord.role !== role) {
      throw new Error(
        `This account is registered as a "${userRecord.role}". ` +
        `Please select the correct role to sign in.`
      );
    }

    const passwordMatch = await bcrypt.compare(password, userRecord.passwordHash);
    if (!passwordMatch) {
      throw new Error('Incorrect password. Please try again.');
    }

    this._setSession(userRecord);
    if (role === 'ngo') this.router.navigate(['/ngo/dashboard']);
    else if (role === 'volunteer') this.router.navigate(['/volunteer/dashboard']);
    else this.router.navigate(['/victim/dashboard']);
  }

  // ── CHANGE PASSWORD (FIX) ────────────────────────────────
  // Fetches current user record from Firestore, verifies the current password
  // with bcrypt.compare, hashes the new password with bcrypt, and writes the
  // new passwordHash to Firestore immediately (real-time update).

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const email = localStorage.getItem('userEmail') || '';
    if (!email) {
      throw new Error('You must be logged in to change your password.');
    }

    const userRef = doc(this.db, 'users', email);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      throw new Error('User record not found. Please log in again.');
    }

    const userRecord = snap.data() as UserRecord;

    // Verify the current password against the stored bcrypt hash
    const passwordMatch = await bcrypt.compare(currentPassword, userRecord.passwordHash);
    if (!passwordMatch) {
      throw new Error('Current password is incorrect. Please try again.');
    }

    // Hash the new password with bcrypt (salt rounds = 10)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Persist the new bcrypt hash to Firestore in real-time
    await updateDoc(userRef, { passwordHash: newPasswordHash });
  }

  // ── PASSWORD RESET ───────────────────────────────────────

  async resetPassword(email: string): Promise<void> {
    console.log('Password reset requested for:', email);
    throw new Error('Password reset via email is not yet configured. Please contact support.');
  }

  // ── PROFILE ─────────────────────────────────────────────

  async updateProfile(updates: Partial<UserRecord>): Promise<void> {
    const email = localStorage.getItem('userEmail') || '';
    if (!email) return;

    const userRef = doc(this.db, 'users', email);
    const safeUpdates = { ...updates };
    delete safeUpdates.passwordHash;
    delete safeUpdates.uid;

    await updateDoc(userRef, safeUpdates as any);

    if (updates.displayName) {
      localStorage.setItem('userName', updates.displayName);
    }

    const existing = this.getProfileData();
    localStorage.setItem('userProfile_' + email, JSON.stringify({ ...existing, ...safeUpdates }));
  }

  getProfileData(): any {
    const email = localStorage.getItem('userEmail') || '';
    const stored = localStorage.getItem('userProfile_' + email);
    return stored ? JSON.parse(stored) : {};
  }

  async fetchFullProfile(): Promise<UserRecord | null> {
    const email = localStorage.getItem('userEmail') || '';
    if (!email) return null;
    const snap = await getDoc(doc(this.db, 'users', email));
    return snap.exists() ? snap.data() as UserRecord : null;
  }

  // ── SESSION HELPERS ──────────────────────────────────────

  private _setSession(userRecord: UserRecord): void {
    localStorage.setItem('userRole', userRecord.role);
    localStorage.setItem('userEmail', userRecord.email);
    localStorage.setItem('userName', userRecord.displayName);
    localStorage.setItem('userId', userRecord.uid);
    const profile = { ...userRecord };
    delete (profile as any).passwordHash;
    localStorage.setItem('userProfile_' + userRecord.email, JSON.stringify(profile));
  }

  logout(): void {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    this.router.navigate(['/']);
  }

  getCurrentUser(): any {
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    if (email) return { email, displayName: name || email.split('@')[0] };
    return null;
  }

  getUserId(): string {
    return localStorage.getItem('userEmail') || 'anonymous';
  }

  isLoggedIn(): boolean { return !!localStorage.getItem('userEmail'); }

  getUserRole(): string { return localStorage.getItem('userRole') || ''; }
}
