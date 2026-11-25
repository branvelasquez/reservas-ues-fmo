
import {
  Component,
  computed,
  signal,
  Input,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

import {
  SolicitudesService,
  Solicitud,
  EstadoSolicitud,
  UserRole,
  VistaSolicitudes
} from '../../core/services/solicitudes.service';

interface FormularioSolicitud {
  espacio: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  carrera: string;
  asignatura: string;
  docente: string;
  participantes: number | null;
  motivo: string;
  tipoActividad: string;
}

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css'
})
export class Solicitudes implements OnChanges {

  private readonly solicitudesService = inject(SolicitudesService);

  @Input() userRole: UserRole = 'administrador';
  @Input() vista: VistaSolicitudes = 'administracion';

  protected readonly mostrarFormulario = signal(false);
  protected readonly mostrarDetalle = signal(false);
  protected readonly mostrarRechazo = signal(false);

  protected readonly solicitudSeleccionada = signal<Solicitud | null>(null);
  protected readonly motivoRechazo = signal('');

  protected readonly busqueda = signal('');
  protected readonly estadoFiltro = signal<EstadoSolicitud | 'Todos'>('Todos');
  protected readonly mensajeError = signal('');
  protected readonly archivosSeleccionados = signal<File[]>([]);

  protected readonly solicitudes = this.solicitudesService.solicitudes;

  protected readonly estados = [
    'Todos',
    'Pendiente de revisión',
    'En revisión',
    'Aprobada',
    'Rechazada',
    'Cancelada'
  ] as const;

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

  protected formulario: FormularioSolicitud = this.crearFormularioVacio();

  protected get esAdministrador(): boolean {
    return this.userRole === 'administrador';
  }

  protected get esVistaNueva(): boolean {
    return this.vista === 'nueva';
  }

  protected get esVistaMisSolicitudes(): boolean {
    return this.vista === 'mis';
  }

  protected get tituloModulo(): string {
    if (this.esAdministrador) return 'Gestión de solicitudes';

    return this.esVistaNueva
      ? 'Nueva solicitud de reserva'
      : 'Mis solicitudes';
  }

  protected get descripcionModulo(): string {
    if (this.esAdministrador) {
      return 'Consultá, revisá y gestioná las solicitudes de reserva institucionales.';
    }

    if (this.userRole === 'docente') {
      return 'Registrá solicitudes y consultá el estado de tus reservas como docente.';
    }

    return 'Registrá solicitudes y consultá el estado de tus reservas como estudiante.';
  }

  protected readonly solicitudesFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.estadoFiltro();

    return this.solicitudes().filter(solicitud => {
      const perteneceAlPerfil =
        this.esAdministrador ||
        solicitud.rolSolicitante === this.userRole;

      const coincideEstado =
        estado === 'Todos' || solicitud.estado === estado;

      const coincideBusqueda =
        !texto ||
        solicitud.id.toLowerCase().includes(texto) ||
        solicitud.espacio.toLowerCase().includes(texto) ||
        solicitud.carrera.toLowerCase().includes(texto) ||
        solicitud.asignatura.toLowerCase().includes(texto) ||
        solicitud.docente.toLowerCase().includes(texto);

      return perteneceAlPerfil && coincideEstado && coincideBusqueda;
    });
  });

  protected readonly totalSolicitudes = computed(
    () => this.solicitudesFiltradas().length
  );

  protected readonly pendientes = computed(
    () => this.contarPorEstado('Pendiente de revisión')
  );

  protected readonly enRevision = computed(
    () => this.contarPorEstado('En revisión')
  );

  protected readonly aprobadas = computed(
    () => this.contarPorEstado('Aprobada')
  );

  protected readonly rechazadas = computed(
    () => this.contarPorEstado('Rechazada')
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vista']) {
      if (this.vista === 'nueva') {
        this.abrirFormulario();
      } else {
        this.mostrarFormulario.set(false);
        this.mensajeError.set('');
      }
    }
  }

  private crearFormularioVacio(): FormularioSolicitud {
    return {
      espacio: '',
      fecha: '',
      horaInicio: '',
      horaFin: '',
      carrera: '',
      asignatura: '',
      docente: '',
      participantes: null,
      motivo: '',
      tipoActividad: ''
    };
  }

  private contarPorEstado(estado: EstadoSolicitud): number {
    return this.solicitudesFiltradas().filter(
      solicitud => solicitud.estado === estado
    ).length;
  }

  abrirFormulario(): void {
    this.formulario = this.crearFormularioVacio();
    this.archivosSeleccionados.set([]);
    this.mensajeError.set('');
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.mensajeError.set('');
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarEstado(valor: string): void {
    this.estadoFiltro.set(valor as EstadoSolicitud | 'Todos');
  }

  actualizarArchivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);

    if (archivos.length > 3) {
      this.mensajeError.set('Solo podés adjuntar un máximo de 3 archivos.');
      input.value = '';
      this.archivosSeleccionados.set([]);
      return;
    }

    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    const archivoInvalido = archivos.find(archivo =>
      !tiposPermitidos.includes(archivo.type) ||
      archivo.size > 5 * 1024 * 1024
    );

    if (archivoInvalido) {
      this.mensajeError.set(
        'Los archivos deben ser PDF, JPG o PNG y pesar máximo 5 MB cada uno.'
      );
      input.value = '';
      this.archivosSeleccionados.set([]);
      return;
    }

    this.mensajeError.set('');
    this.archivosSeleccionados.set(archivos);
  }

  quitarArchivo(indice: number): void {
    this.archivosSeleccionados.update(archivos =>
      archivos.filter((_, i) => i !== indice)
    );
  }

  registrarSolicitud(): void {
    this.mensajeError.set('');

    const datos = this.formulario;

    if (
      !datos.espacio ||
      !datos.fecha ||
      !datos.horaInicio ||
      !datos.horaFin ||
      !datos.carrera.trim() ||
      !datos.asignatura.trim() ||
      !datos.docente.trim() ||
      !datos.tipoActividad.trim() ||
      !datos.motivo.trim() ||
      !datos.participantes ||
      datos.participantes < 1
    ) {
      this.mensajeError.set('Completá todos los campos obligatorios.');
      return;
    }

    const fechaSolicitada = new Date(`${datos.fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diferenciaDias = Math.floor(
      (fechaSolicitada.getTime() - hoy.getTime()) / 86400000
    );

    if (diferenciaDias < 1) {
      this.mensajeError.set(
        'La fecha debe ser futura. Las solicitudes con un día de anticipación son excepcionales y deben ser revisadas por el encargado.'
      );
      return;
    }

    if (datos.horaFin <= datos.horaInicio) {
      this.mensajeError.set(
        'La hora de finalización debe ser posterior a la hora de inicio.'
      );
      return;
    }

    const dentroDelHorarioMatutino =
      datos.horaInicio >= '07:00' && datos.horaFin <= '12:00';

    const dentroDelHorarioVespertino =
      datos.horaInicio >= '13:00' && datos.horaFin <= '16:00';

    if (!dentroDelHorarioMatutino && !dentroDelHorarioVespertino) {
      this.mensajeError.set(
        'El horario permitido es de lunes a sábado, de 7:00 a 12:00 o de 13:00 a 16:00.'
      );
      return;
    }

    if (fechaSolicitada.getDay() === 0) {
      this.mensajeError.set('No se pueden solicitar reservas para los domingos.');
      return;
    }

    const numeroSolicitud = this.solicitudes().length + 1;

    const nuevaSolicitud: Solicitud = {
      id: `SOL-${String(numeroSolicitud).padStart(3, '0')}`,
      espacio: datos.espacio,
      fecha: datos.fecha,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      carrera: datos.carrera.trim(),
      asignatura: datos.asignatura.trim(),
      docente: datos.docente.trim(),
      participantes: Number(datos.participantes),
      motivo: datos.motivo.trim(),
      tipoActividad: datos.tipoActividad.trim(),
      archivos: this.archivosSeleccionados().map(archivo => archivo.name),
      estado: 'Pendiente de revisión',
      rolSolicitante: this.userRole
    };

    this.solicitudes.update(actuales => [
      nuevaSolicitud,
      ...actuales
    ]);

    this.cerrarFormulario();
    this.formulario = this.crearFormularioVacio();
    this.archivosSeleccionados.set([]);
  }

  abrirDetalle(solicitud: Solicitud): void {
    this.solicitudSeleccionada.set(solicitud);
    this.mostrarDetalle.set(true);
  }

  cerrarDetalle(): void {
    this.mostrarDetalle.set(false);
    this.solicitudSeleccionada.set(null);
  }

  iniciarRevision(solicitud: Solicitud): void {
    if (!this.esAdministrador || solicitud.estado !== 'Pendiente de revisión') {
      return;
    }

    this.actualizarEstadoSolicitud(solicitud.id, 'En revisión');
  }

  aprobarSolicitud(solicitud: Solicitud): void {
    if (!this.esAdministrador || solicitud.estado !== 'En revisión') {
      return;
    }

    this.actualizarEstadoSolicitud(solicitud.id, 'Aprobada');
    this.cerrarDetalle();
  }

  abrirRechazo(solicitud: Solicitud): void {
    if (!this.esAdministrador || solicitud.estado !== 'En revisión') {
      return;
    }

    this.solicitudSeleccionada.set(solicitud);
    this.motivoRechazo.set('');
    this.mensajeError.set('');
    this.mostrarRechazo.set(true);
  }

  cerrarRechazo(): void {
    this.mostrarRechazo.set(false);
    this.motivoRechazo.set('');
    this.mensajeError.set('');
    this.solicitudSeleccionada.set(null);
  }

  rechazarSolicitud(): void {
    if (!this.esAdministrador) return;

    const solicitud = this.solicitudSeleccionada();
    const motivo = this.motivoRechazo().trim();

    if (!solicitud || solicitud.estado !== 'En revisión') return;

    if (!motivo) {
      this.mensajeError.set('Debés indicar el motivo del rechazo.');
      return;
    }

    this.solicitudes.update(actuales =>
      actuales.map(item =>
        item.id === solicitud.id
          ? { ...item, estado: 'Rechazada', motivoRechazo: motivo }
          : item
      )
    );

    this.cerrarRechazo();
    this.cerrarDetalle();
  }

  private actualizarEstadoSolicitud(
    id: string,
    nuevoEstado: EstadoSolicitud
  ): void {
    this.solicitudes.update(actuales =>
      actuales.map(solicitud =>
        solicitud.id === id
          ? { ...solicitud, estado: nuevoEstado }
          : solicitud
      )
    );

    const actualizada = this.solicitudes().find(
      solicitud => solicitud.id === id
    );

    if (actualizada) {
      this.solicitudSeleccionada.set(actualizada);
    }
  }

  obtenerClaseEstado(estado: EstadoSolicitud): string {
    switch (estado) {
      case 'Pendiente de revisión': return 'pending';
      case 'En revisión': return 'review';
      case 'Aprobada': return 'approved';
      case 'Rechazada': return 'rejected';
      case 'Cancelada': return 'cancelled';
    }
  }
}
