
import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { MatSnackBar } from '@angular/material/snack-bar';

@Component({

  selector: 'app-register',

  templateUrl: './register.component.html',

  styleUrls: ['./register.component.scss']

})

export class RegisterComponent implements OnInit {

  email = '';

  password = '';

  confirmPassword = '';

  displayName = '';

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

  async onRegister() {

    if (this.password !== this.confirmPassword) {

      this.snackBar.open('Passwords do not match.', 'OK', { duration: 3000 });

      return;

    }

    if (this.password.length < 6) {

      this.snackBar.open('Password must be at least 6 characters.', 'OK', { duration: 3000 });

      return;

    }

    this.isLoading = true;

    try {

      await this.authService.register(this.email, this.password, this.displayName, this.role);

    } catch (err: any) {

      this.snackBar.open(err.message || 'Registration failed.', 'OK', { duration: 4000 });

    } finally {

      this.isLoading = false;

    }

  }

}
