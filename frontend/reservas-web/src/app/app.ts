
import { Component, signal } from '@angular/core';

import { Login } from './pages/login/login';
import { AccessRequest } from './pages/access-request/access-request';
import { Dashboard } from './pages/dashboard/dashboard';

type View = 'login' | 'request' | 'dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Login,
    AccessRequest,
    Dashboard
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  protected readonly isDark = signal(false);

  protected readonly currentView = signal<View>('login');

  toggleTheme(): void {
    this.isDark.update(value => !value);
  }

  showAccessRequest(): void {
    this.currentView.set('request');
  }

  showLogin(): void {
    this.currentView.set('login');
  }

  openDashboardPreview(): void {
    this.currentView.set('dashboard');
  }

  closeDashboardPreview(): void {
    this.currentView.set('login');
  }
}
