
import { Component, EventEmitter, Output, signal } from '@angular/core';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [],
  templateUrl: './recover-password.html',
  styleUrl: './recover-password.css'
})
export class RecoverPassword {

  @Output() backToLogin = new EventEmitter<void>();

  @Output() previewNewPassword = new EventEmitter<void>();

  protected readonly message = signal('');
  protected readonly email = signal('');

  onEmailChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.email.set(input.value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    this.message.set(
      'La recuperación por correo estará disponible cuando conectemos el servicio de autenticación.'
    );
  }

  returnToLogin(): void {
    this.backToLogin.emit();
  }

  openNewPasswordPreview(): void {
    this.previewNewPassword.emit();
  }
}
