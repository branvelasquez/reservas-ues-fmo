
import { Component, computed, signal } from '@angular/core';

interface DiaCalendario {
  fecha: string;
  numero: number;
  mesActual: boolean;
  esHoy: boolean;
  seleccionado: boolean;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [],
  templateUrl: './calendario.html',
  styleUrl: './calendario.css'
})
export class Calendario {

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

    // La semana comienza en lunes.
    const desplazamiento = (primerDia.getDay() + 6) % 7;

    // Se muestran seis semanas para mantener estable el calendario.
    return Array.from({ length: 42 }, (_, indice) => {
      const fecha = new Date(
        anio,
        mes,
        indice - desplazamiento + 1
      );

      const fechaTexto = this.formatearFecha(fecha);

      return {
        fecha: fechaTexto,
        numero: fecha.getDate(),
        mesActual: fecha.getMonth() === mes,
        esHoy: fechaTexto === this.formatearFecha(this.hoy),
        seleccionado: fechaTexto === this.fechaSeleccionada()
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

    // Si se selecciona un día de otro mes,
    // el calendario cambia automáticamente a ese mes.
    this.anio.set(fechaReal.getFullYear());
    this.mes.set(fechaReal.getMonth());
  }

  actualizarEspacio(valor: string): void {
    this.espacioSeleccionado.set(valor);
  }
}
