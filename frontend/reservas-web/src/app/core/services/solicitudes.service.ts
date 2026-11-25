
import { Injectable, effect, signal } from '@angular/core';

export type EstadoSolicitud =
  | 'Pendiente de revisión'
  | 'En revisión'
  | 'Aprobada'
  | 'Rechazada'
  | 'Cancelada';

export type UserRole = 'administrador' | 'docente' | 'estudiante';

export type VistaSolicitudes = 'administracion' | 'nueva' | 'mis';

export interface Solicitud {
  id: string;
  espacio: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  carrera: string;
  asignatura: string;
  docente: string;
  participantes: number;
  motivo: string;
  tipoActividad: string;
  archivos: string[];
  estado: EstadoSolicitud;
  rolSolicitante: UserRole;
  motivoRechazo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {

  private readonly storageKey = 'ues_fmo_solicitudes';

  readonly solicitudes = signal<Solicitud[]>(
    this.cargarSolicitudes()
  );

  constructor() {
    effect(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify(this.solicitudes())
        );
      }
    });
  }

  private cargarSolicitudes(): Solicitud[] {
    try {
      if (typeof localStorage === 'undefined') {
        return [];
      }

      const datos = localStorage.getItem(this.storageKey);

      if (!datos) {
        return [];
      }

      const solicitudes = JSON.parse(datos);

      return Array.isArray(solicitudes) ? solicitudes : [];

    } catch {
      return [];
    }
  }
}
