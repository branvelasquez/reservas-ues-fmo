
import { Component, EventEmitter, Output, signal } from '@angular/core';

@Component({
  selector: 'app-access-request',
  standalone: true,
  imports: [],
  templateUrl: './access-request.html',
  styleUrl: './access-request.css'
})
export class AccessRequest {

  @Output() backToLogin = new EventEmitter<void>();

  protected readonly message = signal('');

  onRequestAccess(event: Event): void {
    event.preventDefault();

    this.message.set(
      'La solicitud se conectará próximamente con el proceso de autorización.'
    );
  }

  showLogin(): void {
    this.backToLogin.emit();
  }
}
