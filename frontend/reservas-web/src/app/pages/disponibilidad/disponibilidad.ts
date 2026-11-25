
import {
  Component,
  computed,
  signal,
  inject
} from '@angular/core';

import { NgClass } from '@angular/common';

import {
  SolicitudesService,
  Solicitud
} from '../../core/services/solicitudes.service';

@Component({
  selector: 'app-disponibilidad',
  standalone: true,
  imports: [NgClass],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.css'
})
export class Disponibilidad {

  private readonly solicitudesService = inject(SolicitudesService);

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

  protected readonly reservasDelDia = computed(() => {
    const espacio = this.espacioSeleccionado();
    const fecha = this.fechaSeleccionada();

    if (!espacio || !fecha) {
      return [];
    }

    return this.solicitudesService.solicitudes()
      .filter(solicitud =>
        solicitud.espacio === espacio &&
        solicitud.fecha === fecha &&
        (
          solicitud.estado === 'Pendiente de revisión' ||
          solicitud.estado === 'En revisión' ||
          solicitud.estado === 'Aprobada'
        )
      )
      .sort((a, b) =>
        a.horaInicio.localeCompare(b.horaInicio)
      );
  });

  protected readonly reservasEnProceso = computed(() =>
    this.reservasDelDia().filter(solicitud =>
      solicitud.estado === 'Pendiente de revisión' ||
      solicitud.estado === 'En revisión'
    )
  );

  protected readonly reservasAprobadas = computed(() =>
    this.reservasDelDia().filter(solicitud =>
      solicitud.estado === 'Aprobada'
    )
  );

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

  obtenerEstadoVisible(solicitud: Solicitud): string {
    if (
      solicitud.estado === 'Pendiente de revisión' ||
      solicitud.estado === 'En revisión'
    ) {
      return 'En proceso';
    }

    return 'Ocupado';
  }

  obtenerClaseEstado(solicitud: Solicitud): string {
    if (
      solicitud.estado === 'Pendiente de revisión' ||
      solicitud.estado === 'En revisión'
    ) {
      return 'pending';
    }

    return 'occupied';
  }

  formatearFecha(fecha: string): string {
    return new Date(`${fecha}T00:00:00`).toLocaleDateString(
      'es-SV',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  }

  formatearHora(hora: string): string {
    const [horas, minutos] = hora.split(':').map(Number);

    const periodo = horas >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horas % 12 || 12;

    return `${hora12}:${String(minutos).padStart(2, '0')} ${periodo}`;
  }
}
