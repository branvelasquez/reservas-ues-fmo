
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SolicitudReporte {
  codigo: string;
  espacio: string;
  solicitante: string;
  actividad: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: 'Aprobada' | 'Pendiente' | 'Rechazada';
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class ReportesComponent {

  // Filtros
  fechaInicio = '';
  fechaFin = '';
  espacioSeleccionado = '';
  estadoSeleccionado = '';

  // Espacios institucionales
  espacios: string[] = [
    'Laboratorio de Física',
    'Laboratorio de Química',
    'Laboratorio de Industrial',
    'Laboratorio de Biología',
    'Laboratorio de Realidad Virtual',
    'Aula de cómputo A',
    'Aula de cómputo B',
    'Aula de cómputo C'
  ];

  // Sin registros de demostración.
  // Los datos se conectarán posteriormente con la API.
  solicitudes: SolicitudReporte[] = [];

  // Solicitudes según los filtros seleccionados
  get solicitudesFiltradas(): SolicitudReporte[] {
    return this.solicitudes.filter(solicitud => {

      const coincideFechaInicio =
        !this.fechaInicio || solicitud.fecha >= this.fechaInicio;

      const coincideFechaFin =
        !this.fechaFin || solicitud.fecha <= this.fechaFin;

      const coincideEspacio =
        !this.espacioSeleccionado ||
        solicitud.espacio === this.espacioSeleccionado;

      const coincideEstado =
        !this.estadoSeleccionado ||
        solicitud.estado === this.estadoSeleccionado;

      return coincideFechaInicio &&
        coincideFechaFin &&
        coincideEspacio &&
        coincideEstado;
    });
  }

  // Total de solicitudes
  get totalSolicitudes(): number {
    return this.solicitudesFiltradas.length;
  }

  // Total de solicitudes aprobadas
  get solicitudesAprobadas(): number {
    return this.solicitudesFiltradas.filter(
      solicitud => solicitud.estado === 'Aprobada'
    ).length;
  }

  // Total de solicitudes pendientes
  get solicitudesPendientes(): number {
    return this.solicitudesFiltradas.filter(
      solicitud => solicitud.estado === 'Pendiente'
    ).length;
  }

  // Total de solicitudes rechazadas
  get solicitudesRechazadas(): number {
    return this.solicitudesFiltradas.filter(
      solicitud => solicitud.estado === 'Rechazada'
    ).length;
  }

  // Compatibilidad con los nombres utilizados en reportes.html
  get totalAprobadas(): number {
    return this.solicitudesAprobadas;
  }

  get totalPendientes(): number {
    return this.solicitudesPendientes;
  }

  get totalRechazadas(): number {
    return this.solicitudesRechazadas;
  }

  // Porcentaje de aprobación
  get porcentajeAprobacion(): number {
    if (this.totalSolicitudes === 0) {
      return 0;
    }

    return Math.round(
      (this.solicitudesAprobadas / this.totalSolicitudes) * 100
    );
  }

  // Compatibilidad con el HTML
  get porcentajeAprobadas(): number {
    return this.porcentajeAprobacion;
  }

  // Información de solicitudes agrupadas por espacio
  get datosPorEspacio() {
    return this.espacios.map(espacio => {

      const cantidad = this.solicitudesFiltradas.filter(
        solicitud => solicitud.espacio === espacio
      ).length;

      return {
        espacio,
        cantidad,
        total: cantidad,
        porcentaje: this.totalSolicitudes > 0
          ? (cantidad / this.totalSolicitudes) * 100
          : 0
      };
    });
  }

  // Limpiar todos los filtros
  limpiarFiltros(): void {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.espacioSeleccionado = '';
    this.estadoSeleccionado = '';
  }

  // Exportar o imprimir reporte en PDF
  exportarPDF(): void {
    window.print();
  }

  // Clase visual según el estado de la solicitud
  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'Aprobada':
        return 'estado-aprobada';

      case 'Pendiente':
        return 'estado-pendiente';

      case 'Rechazada':
        return 'estado-rechazada';

      default:
        return '';
    }
  }

  // Acortar nombres demasiado largos
  obtenerNombreCorto(nombre: string): string {
    return nombre.length > 22
      ? nombre.substring(0, 22) + '...'
      : nombre;
  }
}
