import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  userName: string = 'User';
  // ✅ FIX 1: role label now reads from localStorage via authService — not from URL
  // This means /profile, /victim/reports, etc. all show the correct role
  roleLabel: string = 'User';
  showNotifPanel = false;
  notifications: AppNotification[] = [];
  private subs: Subscription[] = [];

  get notifCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private notifService: NotificationService
  ) {}

  ngOnInit() {
    // ✅ Read role from localStorage (set at login/register) — never from URL
    const role = this.authService.getUserRole();
    this.roleLabel = role === 'ngo' ? 'NGO Admin'
                   : role === 'volunteer' ? 'Volunteer'
                   : 'Victim / User';

    const user = this.authService.getCurrentUser();
    if (user?.displayName) this.userName = user.displayName;

    // Keep roleLabel fresh if user navigates between role areas
    this.subs.push(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        const r = this.authService.getUserRole();
        this.roleLabel = r === 'ngo' ? 'NGO Admin'
                       : r === 'volunteer' ? 'Volunteer'
                       : 'Victim / User';
      })
    );

    // Load real-time notifications for this user
    const userId = this.authService.getUserId();
    if (userId && userId !== 'anonymous') {
      this.subs.push(
        this.notifService.getNotifications(userId).subscribe(notifs => {
          this.notifications = notifs;
        })
      );
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  markAllRead() {
    const userId = this.authService.getUserId();
    this.notifService.markAllRead(userId);
    this.showNotifPanel = false;
  }

  toggleNotifPanel() {
    this.showNotifPanel = !this.showNotifPanel;
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
