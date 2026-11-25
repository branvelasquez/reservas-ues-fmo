
import { Component, EventEmitter, Output, signal } from '@angular/core';

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [],
  templateUrl: './new-password.html',
  styleUrl: './new-password.css'
})
export class NewPassword {

  @Output() backToLogin = new EventEmitter<void>();

  protected readonly showPassword = signal(false);
  protected readonly showConfirmation = signal(false);
  protected readonly message = signal('');

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmation(): void {
    this.showConfirmation.update(value => !value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const password = form.querySelector<HTMLInputElement>('#new-password')?.value ?? '';
    const confirmation = form.querySelector<HTMLInputElement>('#confirm-password')?.value ?? '';

    if (password.length < 8) {
      this.message.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      this.message.set('Las contraseñas no coinciden. Verificá los datos.');
      return;
    }

    this.message.set(
      'La actualización real de la contraseña estará disponible cuando conectemos el servicio de autenticación.'
    );
  }

  returnToLogin(): void {
    this.backToLogin.emit();
  }
}
