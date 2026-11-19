
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.css'
})
export class Disponibilidad {

  protected readonly espacios = [
    'Laboratorio de Física',
    'Laboratorio de Química',
    'Laboratorio de Industrial',
    'Laboratorio de Biología',
    'Laboratorio de Realidad Virtual',
    'Aula de cómputo A',
    'Aula de cómputo B',
    'Aula de cómputo C'
  ];

  protected readonly espacioSeleccionado = signal('');
  protected readonly fechaSeleccionada = signal('');
  protected readonly consultaRealizada = signal(false);

  actualizarEspacio(event: Event): void {
    const valor = (event.target as HTMLSelectElement).value;

    this.espacioSeleccionado.set(valor);
    this.consultaRealizada.set(false);
  }

  actualizarFecha(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;

    this.fechaSeleccionada.set(valor);
    this.consultaRealizada.set(false);
  }

  puedeConsultar(): boolean {
    return !!this.espacioSeleccionado() &&
           !!this.fechaSeleccionada();
  }

  consultarDisponibilidad(): void {
    if (!this.puedeConsultar()) {
      return;
    }

    this.consultaRealizada.set(true);
  }

  limpiarFiltros(): void {
    this.espacioSeleccionado.set('');
    this.fechaSeleccionada.set('');
    this.consultaRealizada.set(false);
  }
}
