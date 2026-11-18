
import { Component, signal } from '@angular/core';

type EstadoSolicitud =
  | 'Pendiente de revisión'
  | 'En revisión'
  | 'Aprobada'
  | 'Rechazada'
  | 'Cancelada';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css'
})
export class Solicitudes {

  // Control de visibilidad del formulario
  protected readonly mostrarFormulario = signal(false);

  // Búsqueda de solicitudes
  protected readonly busqueda = signal('');

  // Filtro por estado
  protected readonly estadoFiltro = signal<EstadoSolicitud | 'Todos'>('Todos');

  // Estados definidos en los requisitos del proyecto
  protected readonly estados = [
    'Todos',
    'Pendiente de revisión',
    'En revisión',
    'Aprobada',
    'Rechazada',
    'Cancelada'
  ] as const;

  // Por ahora no existen registros conectados a la base de datos
  protected readonly solicitudes: unknown[] = [];

  abrirFormulario(): void {
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarEstado(valor: string): void {
    this.estadoFiltro.set(valor as EstadoSolicitud | 'Todos');
  }
}
