
import { Component, signal } from '@angular/core';

import { Login } from './pages/login/login';
import { AccessRequest } from './pages/access-request/access-request';
import { Dashboard } from './pages/dashboard/dashboard';
import { RecoverPassword } from './pages/recover-password/recover-password';
import { NewPassword } from './pages/new-password/new-password';

export type UserRole =
  | 'administrador'
  | 'docente'
  | 'estudiante';

type View =
  | 'login'
  | 'request'
  | 'recover'
  | 'new-password'
  | 'role-selection'
  | 'dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Login,
    AccessRequest,
    Dashboard,
    RecoverPassword,
    NewPassword
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  protected readonly isDark = signal(false);

  protected readonly currentView = signal<View>('login');

  protected readonly selectedRole = signal<UserRole>('administrador');

  toggleTheme(): void {
    this.isDark.update(value => !value);
  }

  showAccessRequest(): void {
    this.currentView.set('request');
  }

  showLogin(): void {
    this.currentView.set('login');
  }

  showRecoverPassword(): void {
    this.currentView.set('recover');
  }

  showNewPasswordPreview(): void {
    this.currentView.set('new-password');
  }

  openDashboardPreview(): void {
    this.currentView.set('role-selection');
  }

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.currentView.set('dashboard');
  }

  closeDashboardPreview(): void {
    this.currentView.set('login');
  }
}
