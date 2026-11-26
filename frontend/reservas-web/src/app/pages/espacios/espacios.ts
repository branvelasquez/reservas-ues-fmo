
import { Component, computed, signal } from '@angular/core';

type TipoEspacio = 'Laboratorio' | 'Aula de cómputo';
type EstadoRegistro = 'Identificado' | 'Pendiente de confirmar';
type EstadoOperativo =
  | 'Disponible'
  | 'En mantenimiento'
  | 'Fuera de servicio'
  | 'Pendiente de confirmar';

type EstadoEquipo = 'Disponible' | 'Dañado' | 'Fuera de servicio';
type EstadoIncidencia = 'Pendiente' | 'En atención' | 'Resuelta';

interface Equipo {
  id: number;
  nombre: string;
  cantidad: number;
  estado: EstadoEquipo;
  observaciones: string;
}

interface Incidencia {
  id: number;
  descripcion: string;
  fecha: string;
  estado: EstadoIncidencia;
}

interface Espacio {
  id: number;
  nombre: string;
  tipo: TipoEspacio;
  ubicacion: string;
  encargado: string;
  capacidad: number | null;
  estado: EstadoRegistro;
  estadoOperativo: EstadoOperativo;
  equipos: Equipo[];
  incidencias: Incidencia[];
}

@Component({
  selector: 'app-espacios',
  standalone: true,
  imports: [],
  templateUrl: './espacios.html',
  styleUrl: './espacios.css'
})
export class Espacios {


  private readonly storageKey = 'ues_fmo_espacios';

  protected readonly busqueda = signal('');
  protected readonly Number = Number;
  protected readonly filtroTipo = signal('Todos');

  protected readonly mostrarFormulario = signal(false);
  protected readonly espacioEditando = signal<number | null>(null);

  protected readonly nuevoEquipo = signal(false);
  protected readonly nuevaIncidencia = signal(false);

  protected readonly espacios = signal<Espacio[]>(this.cargarEspacios());

  protected readonly formulario = signal({
    nombre: '',
    ubicacion: '',
    encargado: '',
    capacidad: null as number | null,
    estadoOperativo: 'Pendiente de confirmar' as EstadoOperativo
  });

  protected readonly equipoFormulario = signal({
    nombre: '',
    cantidad: 1,
    estado: 'Disponible' as EstadoEquipo,
    observaciones: ''
  });

  protected readonly incidenciaFormulario = signal({
    descripcion: '',
    fecha: new Date().toISOString().slice(0, 10),
    estado: 'Pendiente' as EstadoIncidencia
  });

  protected readonly espaciosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const tipo = this.filtroTipo();

    return this.espacios().filter(espacio => {
      const coincideTexto =
        espacio.nombre.toLowerCase().includes(texto) ||
        espacio.ubicacion.toLowerCase().includes(texto) ||
        espacio.tipo.toLowerCase().includes(texto);

      const coincideTipo =
        tipo === 'Todos' || espacio.tipo === tipo;

      return coincideTexto && coincideTipo;
    });
  });

  protected readonly espacioSeleccionado = computed(() => {
    const id = this.espacioEditando();
    return this.espacios().find(e => e.id === id) ?? null;
  });

  protected readonly totalLaboratorios = computed(
    () => this.espacios().filter(e => e.tipo === 'Laboratorio').length
  );

  protected readonly totalAulas = computed(
    () => this.espacios().filter(e => e.tipo === 'Aula de cómputo').length
  );

  constructor() {}

  private crearEspaciosIniciales(): Espacio[] {
    const datos: Omit<Espacio, 'capacidad' | 'estadoOperativo' | 'equipos' | 'incidencias'>[] = [
      {
        id: 1,
        nombre: 'Laboratorio de Física',
        tipo: 'Laboratorio',
        ubicacion: 'Departamento de Física',
        encargado: 'Por confirmar',
        estado: 'Identificado'
      },
      {
        id: 2,
        nombre: 'Laboratorio de Química',
        tipo: 'Laboratorio',
        ubicacion: 'Departamento de Medicina',
        encargado: 'Por confirmar',
        estado: 'Identificado'
      },
      {
        id: 3,
        nombre: 'Laboratorio de Industrial',
        tipo: 'Laboratorio',
        ubicacion: 'Departamento de Ingeniería y Arquitectura',
        encargado: 'Por confirmar',
        estado: 'Identificado'
      },
      {
        id: 4,
        nombre: 'Laboratorio de Biología',
        tipo: 'Laboratorio',
        ubicacion: 'Departamento de Física',
        encargado: 'Por confirmar',
        estado: 'Identificado'
      },
      {
        id: 5,
        nombre: 'Laboratorio de Realidad Virtual',
        tipo: 'Laboratorio',
        ubicacion: 'Biblioteca',
        encargado: 'Encargado por confirmar',
        estado: 'Identificado'
      },
      {
        id: 6,
        nombre: 'Aula de cómputo A',
        tipo: 'Aula de cómputo',
        ubicacion: 'Edificio de Biblioteca',
        encargado: 'Gestión compartida con Realidad Virtual',
        estado: 'Identificado'
      },
      {
        id: 7,
        nombre: 'Aula de cómputo B',
        tipo: 'Aula de cómputo',
        ubicacion: 'Edificio de Biblioteca',
        encargado: 'Gestión compartida con Realidad Virtual',
        estado: 'Identificado'
      },
      {
        id: 8,
        nombre: 'Aula de cómputo C',
        tipo: 'Aula de cómputo',
        ubicacion: 'Edificio de Biblioteca',
        encargado: 'Gestión compartida con Realidad Virtual',
        estado: 'Identificado'
      }
    ];

    return datos.map(espacio => ({
      ...espacio,
      capacidad: null,
      estadoOperativo: 'Pendiente de confirmar',
      equipos: [],
      incidencias: []
    }));
  }

  private cargarEspacios(): Espacio[] {
    try {
      if (typeof localStorage === 'undefined') {
        return this.crearEspaciosIniciales();
      }

      const datos = localStorage.getItem(this.storageKey);

      if (!datos) {
        return this.crearEspaciosIniciales();
      }

      const espacios = JSON.parse(datos);

      return Array.isArray(espacios)
        ? espacios
        : this.crearEspaciosIniciales();

    } catch {
      return this.crearEspaciosIniciales();
    }
  }

  private guardarCambios(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.espacios())
      );
    }
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarFiltro(valor: string): void {
    this.filtroTipo.set(valor);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroTipo.set('Todos');
  }

  abrirEdicion(espacio: Espacio): void {
    this.espacioEditando.set(espacio.id);

    this.formulario.set({
      nombre: espacio.nombre,
      ubicacion: espacio.ubicacion,
      encargado: espacio.encargado,
      capacidad: espacio.capacidad,
      estadoOperativo: espacio.estadoOperativo
    });

    this.mostrarFormulario.set(true);
    this.nuevoEquipo.set(false);
    this.nuevaIncidencia.set(false);
  }

  cerrarEdicion(): void {
    this.mostrarFormulario.set(false);
    this.espacioEditando.set(null);
    this.nuevoEquipo.set(false);
    this.nuevaIncidencia.set(false);
  }

  actualizarCampo(
    campo: keyof ReturnType<typeof this.formulario>,
    valor: string | number | null
  ): void {
    this.formulario.update(actual => ({
      ...actual,
      [campo]: valor
    }));
  }

  guardarEspacio(): void {
    const id = this.espacioEditando();
    const datos = this.formulario();

    if (!id || !datos.nombre.trim() || !datos.ubicacion.trim()) {
      return;
    }

    if (
      datos.capacidad !== null &&
      (!Number.isInteger(datos.capacidad) || datos.capacidad < 1)
    ) {
      return;
    }

    this.espacios.update(lista =>
      lista.map(espacio =>
        espacio.id === id
          ? {
              ...espacio,
              nombre: datos.nombre.trim(),
              ubicacion: datos.ubicacion.trim(),
              encargado: datos.encargado.trim() || 'Por confirmar',
              capacidad: datos.capacidad,
              estadoOperativo: datos.estadoOperativo
            }
          : espacio
      )
    );

    this.guardarCambios();
    this.cerrarEdicion();
  }

  abrirNuevoEquipo(): void {
    this.equipoFormulario.set({
      nombre: '',
      cantidad: 1,
      estado: 'Disponible',
      observaciones: ''
    });

    this.nuevoEquipo.set(true);
  }

  actualizarEquipoCampo(
    campo: keyof ReturnType<typeof this.equipoFormulario>,
    valor: string | number
  ): void {
    this.equipoFormulario.update(actual => ({
      ...actual,
      [campo]: valor
    }));
  }

  guardarEquipo(): void {
    const id = this.espacioEditando();
    const datos = this.equipoFormulario();

    if (!id || !datos.nombre.trim() ||
        !Number.isInteger(datos.cantidad) || datos.cantidad < 1) {
      return;
    }

    this.espacios.update(lista =>
      lista.map(espacio =>
        espacio.id === id
          ? {
              ...espacio,
              equipos: [
                ...espacio.equipos,
                {
                  id: Date.now(),
                  ...datos,
                  nombre: datos.nombre.trim()
                }
              ]
            }
          : espacio
      )
    );

    this.guardarCambios();
    this.nuevoEquipo.set(false);
  }

  eliminarEquipo(equipoId: number): void {
    const id = this.espacioEditando();
    if (!id) return;

    this.espacios.update(lista =>
      lista.map(espacio =>
        espacio.id === id
          ? {
              ...espacio,
              equipos: espacio.equipos.filter(e => e.id !== equipoId)
            }
          : espacio
      )
    );

    this.guardarCambios();
  }

  abrirNuevaIncidencia(): void {
    this.incidenciaFormulario.set({
      descripcion: '',
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'Pendiente'
    });

    this.nuevaIncidencia.set(true);
  }

  actualizarIncidenciaCampo(
    campo: keyof ReturnType<typeof this.incidenciaFormulario>,
    valor: string
  ): void {
    this.incidenciaFormulario.update(actual => ({
      ...actual,
      [campo]: valor
    }));
  }

  guardarIncidencia(): void {
    const id = this.espacioEditando();
    const datos = this.incidenciaFormulario();

    if (!id || !datos.descripcion.trim() || !datos.fecha) {
      return;
    }

    this.espacios.update(lista =>
      lista.map(espacio =>
        espacio.id === id
          ? {
              ...espacio,
              incidencias: [
                ...espacio.incidencias,
                {
                  id: Date.now(),
                  ...datos,
                  descripcion: datos.descripcion.trim()
                }
              ]
            }
          : espacio
      )
    );

    this.guardarCambios();
    this.nuevaIncidencia.set(false);
  }

  actualizarEstadoIncidencia(
    incidenciaId: number,
    estado: EstadoIncidencia
  ): void {
    const id = this.espacioEditando();
    if (!id) return;

    this.espacios.update(lista =>
      lista.map(espacio =>
        espacio.id === id
          ? {
              ...espacio,
              incidencias: espacio.incidencias.map(incidencia =>
                incidencia.id === incidenciaId
                  ? { ...incidencia, estado }
                  : incidencia
              )
            }
          : espacio
      )
    );

    this.guardarCambios();
  }
}
