
import { Component, OnInit, OnDestroy } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { Subscription } from 'rxjs';

import { filter } from 'rxjs/operators';

interface NavItem {

  label: string;

  icon: string;

  route: string;

}

@Component({

  selector: 'app-sidebar',

  templateUrl: './sidebar.component.html',

  styleUrls: ['./sidebar.component.scss']

})

export class SidebarComponent implements OnInit, OnDestroy {

  role: string = 'ngo';

  roleLabel: string = 'NGO Admin';

  navItems: NavItem[] = [];

  currentUrl: string = '';

  private routerSub!: Subscription;

  private ngoNav: NavItem[] = [

    { label: 'Dashboard',   icon: 'dashboard',      route: '/ngo/dashboard' },

    { label: 'Incidents',   icon: 'report_problem',  route: '/ngo/incidents' },

    { label: 'Volunteers',  icon: 'people',           route: '/ngo/volunteers' },

    { label: 'Live Map',    icon: 'map',              route: '/ngo/map' },

    { label: 'Reports',     icon: 'analytics',        route: '/ngo/reports' },

  ];

  private volunteerNav: NavItem[] = [

    { label: 'Dashboard',        icon: 'dashboard',  route: '/volunteer/dashboard' },

    { label: 'My Missions',      icon: 'assignment', route: '/volunteer/missions' },

    { label: 'Report Incident',  icon: 'campaign',   route: '/volunteer/report' },

  ];

  private victimNav: NavItem[] = [

    { label: 'Dashboard',      icon: 'dashboard',    route: '/victim/dashboard' },

    { label: 'My Reports',     icon: 'folder_open',  route: '/victim/reports' },

    { label: 'Emergency Help', icon: 'emergency',    route: '/victim/emergency' },

  ];

  constructor(

    private router: Router,

    private authService: AuthService

  ) {}

  ngOnInit() {

    // ✅ Use stored role — not URL — so navigation doesn't break detection

    this.applyRole(this.authService.getUserRole());

    this.currentUrl = this.router.url;

    // ✅ Update currentUrl on every navigation so isActive() stays correct

    this.routerSub = this.router.events

      .pipe(filter(e => e instanceof NavigationEnd))

      .subscribe((e: any) => {

        this.currentUrl = e.urlAfterRedirects;

        // Re-apply role in case it changed

        this.applyRole(this.authService.getUserRole());

      });

  }

  ngOnDestroy() {

    this.routerSub?.unsubscribe();

  }

  private applyRole(role: string) {

    if (role === 'ngo') {

      this.role = 'ngo';

      this.roleLabel = 'NGO Admin';

      this.navItems = this.ngoNav;

    } else if (role === 'volunteer') {

      this.role = 'volunteer';

      this.roleLabel = 'Volunteer';

      this.navItems = this.volunteerNav;

    } else {

      this.role = 'victim';

      this.roleLabel = 'Victim / User';

      this.navItems = this.victimNav;

    }

  }

  isActive(route: string): boolean {

    return this.currentUrl === route || this.currentUrl.startsWith(route + '/');

  }

  onLogout() {

    this.authService.logout();

  }

}
