
import { Component, EventEmitter, Output, signal } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  @Output() requestAccess = new EventEmitter<void>();

  @Output() previewDashboard = new EventEmitter<void>();

  protected readonly showPassword = signal(false);
  protected readonly message = signal('');

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  onLogin(event: Event): void {
    event.preventDefault();

    this.message.set(
      'La autenticación real se conectará próximamente.'
    );
  }

  showAccessRequest(): void {
    this.requestAccess.emit();
  }

  openDashboardPreview(): void {
    this.previewDashboard.emit();
  }
}
