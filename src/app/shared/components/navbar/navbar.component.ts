import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  userName: string = 'User';
  roleLabel: string = 'User';
  notifications: AppNotification[] = [];
  notifCount: number = 0;
  private notifSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    public notifService: NotificationService
  ) {}

  ngOnInit() {
    this._applyUserInfo();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this._applyUserInfo());

    // Subscribe to live notifications
    this.notifSub = this.notifService.getNotifications().subscribe(notifs => {
      this.notifications = notifs.slice(0, 5); // Show latest 5 in dropdown
      this.notifCount = notifs.filter(n => !n.read).length;
    });
  }

  private _applyUserInfo(): void {
    const user = this.authService.getCurrentUser();
    const role = this.authService.getUserRole();
    if (user?.displayName) this.userName = user.displayName;
    if (role === 'ngo') this.roleLabel = 'NGO Admin';
    else if (role === 'volunteer') this.roleLabel = 'Volunteer';
    else if (role === 'victim') this.roleLabel = 'Victim / User';
    else this.roleLabel = 'User';

    // Start notification listener for the logged-in user
    if (user?.email) {
      this.notifService.listenForUser(user.email);
    }
  }

  markAllRead(): void {
    const user = this.authService.getCurrentUser();
    if (user?.email) this.notifService.markAllRead(user.email);
  }

  getNotifIcon(type: string): string {
    if (type === 'volunteer_assigned') return 'directions_run';
    if (type === 'incident_completed') return 'check_circle';
    return 'notifications';
  }

  getNotifColor(type: string): string {
    if (type === 'volunteer_assigned') return '#f57c00';
    if (type === 'incident_completed') return '#388e3c';
    return '#1976d2';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  isDarkMode: boolean = false;
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark-theme', this.isDarkMode);
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }
}
