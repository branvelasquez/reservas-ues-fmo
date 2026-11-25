
import { Component, computed, signal, inject } from '@angular/core';
import {
  SolicitudesService,
  Solicitud
} from '../../core/services/solicitudes.service';

interface DiaCalendario {
  fecha: string;
  numero: number;
  mesActual: boolean;
  esHoy: boolean;
  seleccionado: boolean;
  tieneReservas: boolean;
  tieneEnProceso: boolean;
  tieneAprobadas: boolean;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [],
  templateUrl: './calendario.html',
  styleUrl: './calendario.css'
})
export class Calendario {

  private readonly solicitudesService = inject(SolicitudesService);
  private readonly hoy = new Date();

  protected readonly anio = signal(this.hoy.getFullYear());
  protected readonly mes = signal(this.hoy.getMonth());

  protected readonly fechaSeleccionada = signal(
    this.formatearFecha(this.hoy)
  );

  protected readonly espacioSeleccionado = signal('Todos los espacios');

  protected readonly espacios = [
    'Todos los espacios',
    'Laboratorio de Física',
    'Laboratorio de Química',
    'Laboratorio de Industrial',
    'Laboratorio de Biología',
    'Laboratorio de Realidad Virtual',
    'Aula de cómputo A',
    'Aula de cómputo B',
    'Aula de cómputo C'
  ];

  private readonly solicitudesActivas = computed(() =>
    this.solicitudesService.solicitudes().filter(solicitud =>
      solicitud.estado === 'Pendiente de revisión' ||
      solicitud.estado === 'En revisión' ||
      solicitud.estado === 'Aprobada'
    )
  );

  protected readonly reservasDelDia = computed(() => {
    const fecha = this.fechaSeleccionada();
    const espacio = this.espacioSeleccionado();

    return this.solicitudesActivas()
      .filter(solicitud =>
        solicitud.fecha === fecha &&
        (
          espacio === 'Todos los espacios' ||
          solicitud.espacio === espacio
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

  protected readonly nombreMes = computed(() => {
    const fecha = new Date(this.anio(), this.mes(), 1);

    return new Intl.DateTimeFormat('es-SV', {
      month: 'long',
      year: 'numeric'
    }).format(fecha);
  });

  protected readonly dias = computed<DiaCalendario[]>(() => {
    const anio = this.anio();
    const mes = this.mes();
    const primerDia = new Date(anio, mes, 1);
    const desplazamiento = (primerDia.getDay() + 6) % 7;
    const solicitudes = this.solicitudesActivas();

    return Array.from({ length: 42 }, (_, indice) => {
      const fecha = new Date(
        anio,
        mes,
        indice - desplazamiento + 1
      );

      const fechaTexto = this.formatearFecha(fecha);

      const reservasFecha = solicitudes.filter(solicitud =>
        solicitud.fecha === fechaTexto &&
        (
          this.espacioSeleccionado() === 'Todos los espacios' ||
          solicitud.espacio === this.espacioSeleccionado()
        )
      );

      return {
        fecha: fechaTexto,
        numero: fecha.getDate(),
        mesActual: fecha.getMonth() === mes,
        esHoy: fechaTexto === this.formatearFecha(this.hoy),
        seleccionado: fechaTexto === this.fechaSeleccionada(),
        tieneReservas: reservasFecha.length > 0,
        tieneEnProceso: reservasFecha.some(solicitud =>
          solicitud.estado === 'Pendiente de revisión' ||
          solicitud.estado === 'En revisión'
        ),
        tieneAprobadas: reservasFecha.some(solicitud =>
          solicitud.estado === 'Aprobada'
        )
      };
    });
  });

  protected readonly fechaSeleccionadaTexto = computed(() => {
    const fecha = this.convertirFecha(this.fechaSeleccionada());

    return new Intl.DateTimeFormat('es-SV', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(fecha);
  });

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private convertirFecha(valor: string): Date {
    const [anio, mes, dia] = valor.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  cambiarMes(direccion: number): void {
    const nuevaFecha = new Date(
      this.anio(),
      this.mes() + direccion,
      1
    );

    this.anio.set(nuevaFecha.getFullYear());
    this.mes.set(nuevaFecha.getMonth());
  }

  irAHoy(): void {
    this.anio.set(this.hoy.getFullYear());
    this.mes.set(this.hoy.getMonth());
    this.fechaSeleccionada.set(this.formatearFecha(this.hoy));
  }

  seleccionarDia(fecha: string): void {
    this.fechaSeleccionada.set(fecha);

    const fechaReal = this.convertirFecha(fecha);

    this.anio.set(fechaReal.getFullYear());
    this.mes.set(fechaReal.getMonth());
  }

  actualizarEspacio(valor: string): void {
    this.espacioSeleccionado.set(valor);
  }

  obtenerEstadoVisible(solicitud: Solicitud): string {
    return solicitud.estado === 'Aprobada'
      ? 'Ocupado'
      : 'En proceso';
  }

  obtenerClaseEstado(solicitud: Solicitud): string {
    return solicitud.estado === 'Aprobada'
      ? 'occupied'
      : 'pending';
  }

  formatearHora(hora: string): string {
    const [horas, minutos] = hora.split(':').map(Number);
    const periodo = horas >= 12 ? 'p. m.' : 'a. m.';
    const hora12 = horas % 12 || 12;

    return `${hora12}:${String(minutos).padStart(2, '0')} ${periodo}`;
  }
}
