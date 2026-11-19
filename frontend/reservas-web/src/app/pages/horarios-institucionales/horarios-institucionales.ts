import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Dia =
  | 'Lunes'
  | 'Martes'
  | 'Miércoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sábado';

type EstadoSolicitud =
  | 'Pendiente de revisión'
  | 'Aprobada'
  | 'Rechazada';

interface Espacio {
  id: number;
  nombre: string;
  tipo: 'Laboratorio' | 'Aula de cómputo';
  ubicacion: string;
  encargado: string;
  codigo: string;
}

interface Horario {
  id: number;
  espacioId: number;
  asignatura: string;
  grupo: string;
  docente: string;
  dia: Dia;
  horaInicio: string;
  horaFin: string;
  periodo: string;
}

interface SolicitudCambio {
  id: number;
  horarioId: number;
  espacioId: number;
  docente: string;
  diaActual: Dia;
  horaInicioActual: string;
  horaFinActual: string;
  diaSolicitado: Dia;
  horaInicioSolicitada: string;
  horaFinSolicitada: string;
  motivo: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
}

interface Movimiento {
  id: number;
  espacioId: number;
  descripcion: string;
  detalle: string;
  fecha: string;
  responsable: string;
}

@Component({
  selector: 'app-horarios-institucionales',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './horarios-institucionales.html',
  styleUrl: './horarios-institucionales.css'
})
export class HorariosInstitucionales {

  protected readonly espacios: Espacio[] = [
    {
      id: 1,
      codigo: 'LAB-001',
      nombre: 'Laboratorio de Física',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 2,
      codigo: 'LAB-002',
      nombre: 'Laboratorio de Química',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 3,
      codigo: 'LAB-003',
      nombre: 'Laboratorio de Industrial',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 4,
      codigo: 'LAB-004',
      nombre: 'Laboratorio de Biología',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 5,
      codigo: 'LAB-005',
      nombre: 'Laboratorio de Realidad Virtual',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Ing. Astrid · Coordinadora de carrera'
    },
    {
      id: 6,
      codigo: 'AUL-001',
      nombre: 'Aula de cómputo A',
      tipo: 'Aula de cómputo',
      ubicacion: 'Edificio de Biblioteca',
      encargado: 'Ing. Astrid · Coordinadora de carrera'
    },
    {
      id: 7,
      codigo: 'AUL-002',
      nombre: 'Aula de cómputo B',
      tipo: 'Aula de cómputo',
      ubicacion: 'Edificio de Biblioteca',
      encargado: 'Ing. Astrid · Coordinadora de carrera'
    },
    {
      id: 8,
      codigo: 'AUL-003',
      nombre: 'Aula de cómputo C',
      tipo: 'Aula de cómputo',
      ubicacion: 'Edificio de Biblioteca',
      encargado: 'Ing. Astrid · Coordinadora de carrera'
    }
  ];

  protected readonly horarios = signal<Horario[]>([]);
  protected readonly solicitudes = signal<SolicitudCambio[]>([]);
  protected readonly historial = signal<Movimiento[]>([]);

  protected readonly espacioSeleccionado = signal<Espacio | null>(null);
  protected readonly vistaActiva = signal<'horarios' | 'solicitudes' | 'historial'>('horarios');

  protected readonly mostrarFormularioHorario = signal(false);
  protected readonly mostrarFormularioSolicitud = signal(false);

  protected readonly dias: Dia[] = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
  ];

  protected readonly horariosDelEspacio = computed(() => {
    const espacio = this.espacioSeleccionado();

    if (!espacio) {
      return [];
    }

    return this.horarios()
      .filter(horario => horario.espacioId === espacio.id)
      .sort((a, b) => {
        const ordenA = this.dias.indexOf(a.dia);
        const ordenB = this.dias.indexOf(b.dia);

        if (ordenA !== ordenB) {
          return ordenA - ordenB;
        }

        return a.horaInicio.localeCompare(b.horaInicio);
      });
  });

  protected readonly solicitudesDelEspacio = computed(() => {
    const espacio = this.espacioSeleccionado();

    if (!espacio) {
      return [];
    }

    return this.solicitudes()
      .filter(solicitud => solicitud.espacioId === espacio.id)
      .sort((a, b) => b.id - a.id);
  });

  protected readonly historialDelEspacio = computed(() => {
    const espacio = this.espacioSeleccionado();

    if (!espacio) {
      return [];
    }

    return this.historial()
      .filter(movimiento => movimiento.espacioId === espacio.id)
      .sort((a, b) => b.id - a.id);
  });

  protected readonly totalHorarios = computed(() => {
    return this.horarios().length;
  });

  protected readonly totalSolicitudesPendientes = computed(() => {
    return this.solicitudes().filter(
      solicitud => solicitud.estado === 'Pendiente de revisión'
    ).length;
  });

  protected readonly horariosPorEspacio = (espacioId: number): number => {
    return this.horarios().filter(
      horario => horario.espacioId === espacioId
    ).length;
  };

  protected readonly pendientesPorEspacio = (espacioId: number): number => {
    return this.solicitudes().filter(
      solicitud =>
        solicitud.espacioId === espacioId &&
        solicitud.estado === 'Pendiente de revisión'
    ).length;
  };

  // Datos del formulario de horario
  protected nuevoHorario = {
    asignatura: '',
    grupo: '',
    docente: '',
    dia: 'Lunes' as Dia,
    horaInicio: '',
    horaFin: '',
    periodo: ''
  };

  // Datos del formulario de solicitud
  protected solicitudCambio = {
    horarioId: 0,
    docente: '',
    diaSolicitado: 'Lunes' as Dia,
    horaInicioSolicitada: '',
    horaFinSolicitada: '',
    motivo: ''
  };

  protected readonly horarioSeleccionado = signal<Horario | null>(null);

  abrirEspacio(espacio: Espacio): void {
    this.espacioSeleccionado.set(espacio);
    this.vistaActiva.set('horarios');
    this.cerrarFormularios();
  }

  volverAlCatalogo(): void {
    this.espacioSeleccionado.set(null);
    this.cerrarFormularios();
  }

  cambiarVista(vista: 'horarios' | 'solicitudes' | 'historial'): void {
    this.vistaActiva.set(vista);
    this.cerrarFormularios();
  }

  abrirFormularioHorario(): void {
    this.nuevoHorario = {
      asignatura: '',
      grupo: '',
      docente: '',
      dia: 'Lunes',
      horaInicio: '',
      horaFin: '',
      periodo: ''
    };

    this.mostrarFormularioHorario.set(true);
  }

  cerrarFormularioHorario(): void {
    this.mostrarFormularioHorario.set(false);
  }

  registrarHorario(event: Event): void {
    event.preventDefault();

    const espacio = this.espacioSeleccionado();

    if (
      !espacio ||
      !this.nuevoHorario.asignatura.trim() ||
      !this.nuevoHorario.docente.trim() ||
      !this.nuevoHorario.horaInicio ||
      !this.nuevoHorario.horaFin ||
      !this.nuevoHorario.periodo.trim()
    ) {
      return;
    }

    if (this.nuevoHorario.horaInicio >= this.nuevoHorario.horaFin) {
      return;
    }

    const nuevo: Horario = {
      id: Date.now(),
      espacioId: espacio.id,
      asignatura: this.nuevoHorario.asignatura.trim(),
      grupo: this.nuevoHorario.grupo.trim(),
      docente: this.nuevoHorario.docente.trim(),
      dia: this.nuevoHorario.dia,
      horaInicio: this.nuevoHorario.horaInicio,
      horaFin: this.nuevoHorario.horaFin,
      periodo: this.nuevoHorario.periodo.trim()
    };

    this.horarios.update(lista => [...lista, nuevo]);

    this.agregarMovimiento(
      espacio.id,
      'Horario registrado',
      `Se registró el horario de ${nuevo.asignatura}.`,
      espacio.encargado
    );

    this.cerrarFormularioHorario();
  }

  abrirFormularioSolicitud(horario: Horario): void {
    this.horarioSeleccionado.set(horario);

    this.solicitudCambio = {
      horarioId: horario.id,
      docente: horario.docente,
      diaSolicitado: horario.dia,
      horaInicioSolicitada: horario.horaInicio,
      horaFinSolicitada: horario.horaFin,
      motivo: ''
    };

    this.mostrarFormularioSolicitud.set(true);
  }

  cerrarFormularioSolicitud(): void {
    this.mostrarFormularioSolicitud.set(false);
    this.horarioSeleccionado.set(null);
  }

  registrarSolicitud(event: Event): void {
    event.preventDefault();

    const espacio = this.espacioSeleccionado();
    const horario = this.horarioSeleccionado();

    if (!espacio || !horario) {
      return;
    }

    const datos = this.solicitudCambio;

    if (
      !datos.docente.trim() ||
      !datos.horaInicioSolicitada ||
      !datos.horaFinSolicitada ||
      !datos.motivo.trim() ||
      datos.horaInicioSolicitada >= datos.horaFinSolicitada
    ) {
      return;
    }

    const nuevaSolicitud: SolicitudCambio = {
      id: Date.now(),
      horarioId: horario.id,
      espacioId: espacio.id,
      docente: datos.docente.trim(),
      diaActual: horario.dia,
      horaInicioActual: horario.horaInicio,
      horaFinActual: horario.horaFin,
      diaSolicitado: datos.diaSolicitado,
      horaInicioSolicitada: datos.horaInicioSolicitada,
      horaFinSolicitada: datos.horaFinSolicitada,
      motivo: datos.motivo.trim(),
      estado: 'Pendiente de revisión',
      fechaSolicitud: new Date().toLocaleDateString('es-SV')
    };

    this.solicitudes.update(lista => [...lista, nuevaSolicitud]);

    this.agregarMovimiento(
      espacio.id,
      'Solicitud de modificación recibida',
      `El docente ${nuevaSolicitud.docente} solicitó modificar el horario de ${horario.asignatura}.`,
      'Sistema'
    );

    this.cerrarFormularioSolicitud();
    this.vistaActiva.set('solicitudes');
  }

  aprobarSolicitud(solicitud: SolicitudCambio): void {
    const espacio = this.espacios.find(
      item => item.id === solicitud.espacioId
    );

    const horario = this.horarios().find(
      item => item.id === solicitud.horarioId
    );

    if (!espacio || !horario || solicitud.estado !== 'Pendiente de revisión') {
      return;
    }

    this.horarios.update(lista =>
      lista.map(item =>
        item.id === horario.id
          ? {
              ...item,
              dia: solicitud.diaSolicitado,
              horaInicio: solicitud.horaInicioSolicitada,
              horaFin: solicitud.horaFinSolicitada
            }
          : item
      )
    );

    this.actualizarEstadoSolicitud(solicitud.id, 'Aprobada');

    this.agregarMovimiento(
      espacio.id,
      'Modificación aprobada',
      `Se actualizó el horario de ${horario.asignatura} según la solicitud del docente ${solicitud.docente}.`,
      espacio.encargado
    );
  }

  rechazarSolicitud(solicitud: SolicitudCambio): void {
    const espacio = this.espacios.find(
      item => item.id === solicitud.espacioId
    );

    if (!espacio || solicitud.estado !== 'Pendiente de revisión') {
      return;
    }

    this.actualizarEstadoSolicitud(solicitud.id, 'Rechazada');

    this.agregarMovimiento(
      espacio.id,
      'Modificación rechazada',
      `Se rechazó la solicitud de modificación del docente ${solicitud.docente}.`,
      espacio.encargado
    );
  }

  private actualizarEstadoSolicitud(
    solicitudId: number,
    estado: EstadoSolicitud
  ): void {
    this.solicitudes.update(lista =>
      lista.map(solicitud =>
        solicitud.id === solicitudId
          ? { ...solicitud, estado }
          : solicitud
      )
    );
  }

  private agregarMovimiento(
    espacioId: number,
    descripcion: string,
    detalle: string,
    responsable: string
  ): void {
    const movimiento: Movimiento = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      espacioId,
      descripcion,
      detalle,
      fecha: new Date().toLocaleString('es-SV'),
      responsable
    };

    this.historial.update(lista => [...lista, movimiento]);
  }

  private cerrarFormularios(): void {
    this.mostrarFormularioHorario.set(false);
    this.mostrarFormularioSolicitud.set(false);
    this.horarioSeleccionado.set(null);
  }

  obtenerNombreEspacio(espacioId: number): string {
    return this.espacios.find(
      espacio => espacio.id === espacioId
    )?.nombre ?? 'Espacio no identificado';
  }
}