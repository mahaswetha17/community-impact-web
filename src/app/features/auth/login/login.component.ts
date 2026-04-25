
import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { MatSnackBar } from '@angular/material/snack-bar';

@Component({

  selector: 'app-login',

  templateUrl: './login.component.html',

  styleUrls: ['./login.component.scss']

})

export class LoginComponent implements OnInit {

  email = '';

  password = '';

  role = 'victim';

  isLoading = false;

  hidePassword = true;

  constructor(

    private route: ActivatedRoute,

    private authService: AuthService,

    private snackBar: MatSnackBar

  ) {}

  ngOnInit() {

    this.role = this.route.snapshot.queryParams['role'] || 'victim';

  }

  async onLogin() {

    if (!this.email || !this.password) return;

    this.isLoading = true;

    try {

      await this.authService.login(this.email, this.password, this.role);

    } catch (err: any) {

      this.snackBar.open(err.message || 'Login failed. Please check your credentials.', 'OK', { duration: 4000 });

    } finally {

      this.isLoading = false;

    }

  }

  async forgotPassword() {

    if (!this.email) {

      this.snackBar.open('Please enter your email address first.', 'OK', { duration: 3000 });

      return;

    }

    try {

      await this.authService.resetPassword(this.email);

      this.snackBar.open('Password reset email sent!', 'OK', { duration: 3000 });

    } catch {

      this.snackBar.open('Failed to send reset email.', 'OK', { duration: 3000 });

    }

  }

}
