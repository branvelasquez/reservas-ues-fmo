
import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Dia =
  | 'Lunes'
  | 'Martes'
  | 'Miércoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sábado';

type CicloAcademico = 'I' | 'II' | 'III' | 'IV';

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
  ciclo: CicloAcademico;
  anio: number;
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

  private readonly storageKey = 'ues_fmo_horarios_institucionales';

  protected readonly espacios: Espacio[] = [
    {
      id: 1,
      codigo: 'LAB-001',
      nombre: 'Laboratorio de Física',
      tipo: 'Laboratorio',
      ubicacion: 'Departamento de Física',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 2,
      codigo: 'LAB-002',
      nombre: 'Laboratorio de Química',
      tipo: 'Laboratorio',
      ubicacion: 'Departamento de Medicina',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 3,
      codigo: 'LAB-003',
      nombre: 'Laboratorio de Industrial',
      tipo: 'Laboratorio',
      ubicacion: 'Departamento de Ingeniería y Arquitectura',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 4,
      codigo: 'LAB-004',
      nombre: 'Laboratorio de Biología',
      tipo: 'Laboratorio',
      ubicacion: 'Departamento de Física',
      encargado: 'Encargado del laboratorio'
    },
    {
      id: 5,
      codigo: 'LAB-005',
      nombre: 'Laboratorio de Realidad Virtual',
      tipo: 'Laboratorio',
      ubicacion: 'Biblioteca',
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

  protected readonly ciclos: CicloAcademico[] = [
    'I',
    'II',
    'III',
    'IV'
  ];

  protected readonly aniosDisponibles: number[] = [
    2026,
    2027,
    2028,
    2029,
    2030
  ];

  protected readonly dias: Dia[] = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
  ];

  protected readonly horarios = signal<Horario[]>([]);
  protected readonly solicitudes = signal<SolicitudCambio[]>([]);
  protected readonly historial = signal<Movimiento[]>([]);

  protected readonly espacioSeleccionado = signal<Espacio | null>(null);

  protected readonly vistaActiva = signal<
    'horarios' | 'solicitudes' | 'historial'
  >('horarios');

  protected readonly mostrarFormularioHorario = signal(false);
  protected readonly mostrarFormularioSolicitud = signal(false);

  protected readonly horarioSeleccionado = signal<Horario | null>(null);

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

  protected nuevoHorario = {
    asignatura: '',
    grupo: '',
    docente: '',
    dia: 'Lunes' as Dia,
    horaInicio: '',
    horaFin: '',
    ciclo: 'II' as CicloAcademico,
    anio: 2026
  };

  protected solicitudCambio = {
    horarioId: 0,
    docente: '',
    diaSolicitado: 'Lunes' as Dia,
    horaInicioSolicitada: '',
    horaFinSolicitada: '',
    motivo: ''
  };

  protected mensajeValidacion = signal('');
  protected tipoMensaje = signal<'error' | 'exito'>('error');

  constructor() {
    this.cargarDatos();

    effect(() => {
      if (typeof localStorage === 'undefined') {
        return;
      }

      const datos = {
        horarios: this.horarios(),
        solicitudes: this.solicitudes(),
        historial: this.historial()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(datos));
    });
  }

  private cargarDatos(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const guardado = localStorage.getItem(this.storageKey);

      if (!guardado) {
        return;
      }

      const datos = JSON.parse(guardado);

      if (Array.isArray(datos.horarios)) {
        this.horarios.set(
          datos.horarios.map((horario: any) => ({
            ...horario,
            espacioId: Number(horario.espacioId),
            ciclo: horario.ciclo
              ? String(horario.ciclo).toUpperCase()
              : this.obtenerCicloAnterior(horario.periodo),
            anio: horario.anio != null
              ? Number(horario.anio)
              : this.obtenerAnioAnterior(horario.periodo)
          }))
        );
      }

      if (Array.isArray(datos.solicitudes)) {
        this.solicitudes.set(datos.solicitudes);
      }

      if (Array.isArray(datos.historial)) {
        this.historial.set(datos.historial);
      }

    } catch {
      this.mostrarMensaje(
        'No fue posible recuperar los horarios guardados.',
        'error'
      );
    }
  }

  private obtenerCicloAnterior(periodo: string): CicloAcademico {
    const coincidencia = periodo?.match(/IV|III|II|I/i);

    return (coincidencia?.[0]?.toUpperCase() as CicloAcademico) ?? 'II';
  }

  private obtenerAnioAnterior(periodo: string): number {
    const coincidencia = periodo?.match(/20\d{2}/);

    return coincidencia ? Number(coincidencia[0]) : 2026;
  }

  abrirEspacio(espacio: Espacio): void {
    this.espacioSeleccionado.set(espacio);
    this.vistaActiva.set('horarios');
    this.cerrarFormularios();
    this.limpiarMensaje();
  }

  volverAlCatalogo(): void {
    this.espacioSeleccionado.set(null);
    this.cerrarFormularios();
    this.limpiarMensaje();
  }

  cambiarVista(vista: 'horarios' | 'solicitudes' | 'historial'): void {
    this.vistaActiva.set(vista);
    this.cerrarFormularios();
    this.limpiarMensaje();
  }

  abrirFormularioHorario(): void {
    this.nuevoHorario = {
      asignatura: '',
      grupo: '',
      docente: '',
      dia: 'Lunes',
      horaInicio: '',
      horaFin: '',
      ciclo: 'II',
      anio: 2026
    };

    this.limpiarMensaje();
    this.mostrarFormularioHorario.set(true);
  }

  cerrarFormularioHorario(): void {
    this.mostrarFormularioHorario.set(false);
    this.limpiarMensaje();
  }

  registrarHorario(event: Event): void {
    event.preventDefault();

    const espacio = this.espacioSeleccionado();

    if (!espacio) {
      return;
    }

    const datos = this.nuevoHorario;

    if (
      !datos.asignatura.trim() ||
      !datos.docente.trim() ||
      !datos.horaInicio ||
      !datos.horaFin
    ) {
      this.mostrarMensaje(
        'Completá los campos obligatorios antes de continuar.',
        'error'
      );
      return;
    }

    if (!this.validarRangoHorario(datos.horaInicio, datos.horaFin)) {
      this.mostrarMensaje(
        'La hora de inicio debe ser anterior a la hora de finalización.',
        'error'
      );
      return;
    }

    const validacionInstitucional = this.validarHorarioInstitucional(
      datos.horaInicio,
      datos.horaFin
    );

    if (!validacionInstitucional.valido) {
      this.mostrarMensaje(validacionInstitucional.mensaje, 'error');
      return;
    }

    const conflicto = this.existeConflicto(
      espacio.id,
      datos.dia,
      datos.horaInicio,
      datos.horaFin,
      datos.ciclo,
      Number(datos.anio)
    );

    if (conflicto) {
      this.mostrarMensaje(
        `¡CHOQUE DE HORARIOS DETECTADO!

El horario que intentás registrar coincide con otro horario existente.

HORARIO QUE GENERA EL CONFLICTO:
Asignatura: ${conflicto.asignatura}
Grupo: ${conflicto.grupo || 'No especificado'}
Docente: ${conflicto.docente}
Día: ${conflicto.dia}
Hora: ${conflicto.horaInicio} - ${conflicto.horaFin}
Período: Ciclo ${conflicto.ciclo} - ${conflicto.anio}

HORARIO QUE INTENTÁS REGISTRAR:
Asignatura: ${datos.asignatura}
Grupo: ${datos.grupo || 'No especificado'}
Docente: ${datos.docente}
Día: ${datos.dia}
Hora: ${datos.horaInicio} - ${datos.horaFin}
Período: Ciclo ${datos.ciclo} - ${datos.anio}

No es posible registrar este horario.`,
        'error'
      );

      return;
    }

    const nuevo: Horario = {
      id: Date.now(),
      espacioId: espacio.id,
      asignatura: datos.asignatura.trim(),
      grupo: datos.grupo.trim(),
      docente: datos.docente.trim(),
      dia: datos.dia,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      ciclo: datos.ciclo,
      anio: Number(datos.anio)
    };

    this.horarios.update(lista => [...lista, nuevo]);

    this.agregarMovimiento(
      espacio.id,
      'Horario institucional registrado',
      `Se registró ${nuevo.asignatura}, grupo ${nuevo.grupo || 'no especificado'}, correspondiente al Ciclo ${nuevo.ciclo} - ${nuevo.anio}.`,
      espacio.encargado
    );

    this.mostrarMensaje('El horario se registró correctamente.', 'exito');
    this.mostrarFormularioHorario.set(false);
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

    this.limpiarMensaje();
    this.mostrarFormularioSolicitud.set(true);
  }

  cerrarFormularioSolicitud(): void {
    this.mostrarFormularioSolicitud.set(false);
    this.horarioSeleccionado.set(null);
    this.limpiarMensaje();
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
      !datos.motivo.trim()
    ) {
      this.mostrarMensaje(
        'Completá todos los campos obligatorios.',
        'error'
      );
      return;
    }

    if (!this.validarRangoHorario(
      datos.horaInicioSolicitada,
      datos.horaFinSolicitada
    )) {
      this.mostrarMensaje(
        'La hora de inicio debe ser anterior a la hora de finalización.',
        'error'
      );
      return;
    }

    const validacionInstitucional = this.validarHorarioInstitucional(
      datos.horaInicioSolicitada,
      datos.horaFinSolicitada
    );

    if (!validacionInstitucional.valido) {
      this.mostrarMensaje(validacionInstitucional.mensaje, 'error');
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

    this.mostrarFormularioSolicitud.set(false);
    this.horarioSeleccionado.set(null);
    this.vistaActiva.set('solicitudes');

    this.mostrarMensaje(
      'La solicitud quedó pendiente de revisión.',
      'exito'
    );
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

    const validacionInstitucional = this.validarHorarioInstitucional(
      solicitud.horaInicioSolicitada,
      solicitud.horaFinSolicitada
    );

    if (!validacionInstitucional.valido) {
      this.mostrarMensaje(validacionInstitucional.mensaje, 'error');
      return;
    }

    const conflicto = this.existeConflicto(
      horario.espacioId,
      solicitud.diaSolicitado,
      solicitud.horaInicioSolicitada,
      solicitud.horaFinSolicitada,
      horario.ciclo,
      horario.anio,
      horario.id
    );

    if (conflicto) {
      this.mostrarMensaje(
        `¡CHOQUE DE HORARIOS DETECTADO!

No se puede aprobar la modificación porque coincide con otro horario existente.

HORARIO QUE GENERA EL CONFLICTO:
Asignatura: ${conflicto.asignatura}
Grupo: ${conflicto.grupo || 'No especificado'}
Docente: ${conflicto.docente}
Día: ${conflicto.dia}
Hora: ${conflicto.horaInicio} - ${conflicto.horaFin}
Período: Ciclo ${conflicto.ciclo} - ${conflicto.anio}

HORARIO SOLICITADO:
Día: ${solicitud.diaSolicitado}
Hora: ${solicitud.horaInicioSolicitada} - ${solicitud.horaFinSolicitada}

La modificación no puede aprobarse.`,
        'error'
      );

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
      'Modificación de horario aprobada',
      `Se actualizó el horario de ${horario.asignatura} según la solicitud del docente ${solicitud.docente}.`,
      espacio.encargado
    );

    this.mostrarMensaje(
      'La modificación fue aprobada correctamente.',
      'exito'
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
      'Modificación de horario rechazada',
      `Se rechazó la solicitud de modificación del docente ${solicitud.docente}. Motivo presentado: ${solicitud.motivo}.`,
      espacio.encargado
    );

    this.mostrarMensaje('La solicitud fue rechazada.', 'exito');
  }

  private existeConflicto(
    espacioId: number,
    dia: Dia,
    horaInicio: string,
    horaFin: string,
    ciclo: CicloAcademico,
    anio: number,
    excluirHorarioId?: number
  ): Horario | undefined {

    const convertirAMinutos = (hora: string): number => {
      const [horas, minutos] = hora.split(':').map(Number);
      return horas * 60 + minutos;
    };

    const inicioNuevo = convertirAMinutos(horaInicio);
    const finNuevo = convertirAMinutos(horaFin);

    return this.horarios().find(horario => {
      const mismoEspacio =
        Number(horario.espacioId) === Number(espacioId);

      const mismoDia = horario.dia === dia;

      const mismoCiclo =
        String(horario.ciclo).trim().toUpperCase() ===
        String(ciclo).trim().toUpperCase();

      const mismoAnio =
        Number(horario.anio) === Number(anio);

      const mismoHorario =
        horario.id !== excluirHorarioId;

      if (
        !mismoEspacio ||
        !mismoDia ||
        !mismoCiclo ||
        !mismoAnio ||
        !mismoHorario
      ) {
        return false;
      }

      const inicioExistente = convertirAMinutos(horario.horaInicio);
      const finExistente = convertirAMinutos(horario.horaFin);

      return (
        inicioNuevo < finExistente &&
        finNuevo > inicioExistente
      );
    });
  }

  private validarRangoHorario(
    horaInicio: string,
    horaFin: string
  ): boolean {
    return horaInicio < horaFin;
  }

  private validarHorarioInstitucional(
    horaInicio: string,
    horaFin: string
  ): { valido: boolean; mensaje: string } {

    const dentroDeManana =
      horaInicio >= '07:00' &&
      horaFin <= '12:00';

    const dentroDeTarde =
      horaInicio >= '13:00' &&
      horaFin <= '16:00';

    if (!dentroDeManana && !dentroDeTarde) {
      return {
        valido: false,
        mensaje: 'El horario debe estar entre 07:00 y 12:00 o entre 13:00 y 16:00. No se permiten horarios durante el receso ni fuera de la jornada institucional.'
      };
    }

    return { valido: true, mensaje: '' };
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

  obtenerPeriodo(horario: Horario): string {
    return `Ciclo ${horario.ciclo} - ${horario.anio}`;
  }

  protected mostrarMensaje(
    mensaje: string,
    tipo: 'error' | 'exito'
  ): void {
    this.mensajeValidacion.set(mensaje);
    this.tipoMensaje.set(tipo);
  }

  protected limpiarMensaje(): void {
    this.mensajeValidacion.set('');
  }
}
