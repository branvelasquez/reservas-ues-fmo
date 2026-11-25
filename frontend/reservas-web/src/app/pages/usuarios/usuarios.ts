
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type RolUsuario = 'Docente' | 'Estudiante' | 'Encargado';
type EstadoUsuario = 'Activo' | 'Inactivo';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  carreraArea: string;
  espaciosAsignados: string[];
  estado: EstadoUsuario;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class UsuariosComponent {

  // El listado se cargará cuando exista la conexión con el sistema.
  usuarios: Usuario[] = [];

  // Filtros
  busqueda = '';
  filtroRol = 'Todos';
  filtroEstado = 'Todos';

  // Control de edición
  mostrarFormulario = false;
  usuarioEditandoId: number | null = null;
  mensajeError = '';

  // Catálogo de espacios
  espaciosDisponibles: string[] = [
    'Laboratorio de Física',
    'Laboratorio de Química',
    'Laboratorio de Industrial',
    'Laboratorio de Biología',
    'Laboratorio de Realidad Virtual',
    'Aula de cómputo A',
    'Aula de cómputo B',
    'Aula de cómputo C'
  ];

  // Datos del usuario que se está editando
  formulario: Usuario = {
    id: 0,
    nombre: '',
    correo: '',
    rol: 'Docente',
    carreraArea: '',
    espaciosAsignados: [],
    estado: 'Activo'
  };

  // Usuarios que cumplen los filtros
  get usuariosFiltrados(): Usuario[] {
    const termino = this.busqueda.trim().toLowerCase();

    return this.usuarios.filter(usuario => {
      const coincideBusqueda =
        !termino ||
        usuario.nombre.toLowerCase().includes(termino) ||
        usuario.correo.toLowerCase().includes(termino);

      const coincideRol =
        this.filtroRol === 'Todos' ||
        usuario.rol === this.filtroRol;

      const coincideEstado =
        this.filtroEstado === 'Todos' ||
        usuario.estado === this.filtroEstado;

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }

  // Indicadores
  get totalUsuarios(): number {
    return this.usuarios.length;
  }

  get totalDocentes(): number {
    return this.usuarios.filter(u => u.rol === 'Docente').length;
  }

  get totalEstudiantes(): number {
    return this.usuarios.filter(u => u.rol === 'Estudiante').length;
  }

  get totalEncargados(): number {
    return this.usuarios.filter(u => u.rol === 'Encargado').length;
  }

  get totalActivos(): number {
    return this.usuarios.filter(u => u.estado === 'Activo').length;
  }

  // Abrir únicamente para editar un usuario existente
  editarUsuario(usuario: Usuario): void {
    this.usuarioEditandoId = usuario.id;

    this.formulario = {
      ...usuario,
      espaciosAsignados: [...usuario.espaciosAsignados]
    };

    this.mensajeError = '';
    this.mostrarFormulario = true;
  }

  // Cerrar formulario
  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.usuarioEditandoId = null;
    this.mensajeError = '';
  }

  // Guardar cambios de un usuario existente
  guardarUsuario(): void {
    this.mensajeError = '';

    if (this.usuarioEditandoId === null) {
      this.mensajeError = 'No hay ningún usuario seleccionado para editar.';
      return;
    }

    const nombre = this.formulario.nombre.trim();
    const correo = this.formulario.correo.trim().toLowerCase();
    const carreraArea = this.formulario.carreraArea.trim();

    if (!nombre || !correo || !carreraArea) {
      this.mensajeError = 'Completá todos los campos obligatorios.';
      return;
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!correoValido) {
      this.mensajeError = 'Ingresá un correo electrónico válido.';
      return;
    }

    const correoExiste = this.usuarios.some(usuario =>
      usuario.correo.toLowerCase() === correo &&
      usuario.id !== this.usuarioEditandoId
    );

    if (correoExiste) {
      this.mensajeError = 'Ya existe otro usuario con ese correo.';
      return;
    }

    if (
      this.formulario.rol === 'Encargado' &&
      this.formulario.espaciosAsignados.length === 0
    ) {
      this.mensajeError = 'Asigná al menos un espacio al encargado.';
      return;
    }

    const indice = this.usuarios.findIndex(
      usuario => usuario.id === this.usuarioEditandoId
    );

    if (indice === -1) {
      this.mensajeError = 'No se encontró el usuario seleccionado.';
      return;
    }

    this.usuarios[indice] = {
      ...this.formulario,
      nombre,
      correo,
      carreraArea,
      espaciosAsignados: [...this.formulario.espaciosAsignados]
    };

    this.cerrarFormulario();
  }

  // Activar o desactivar una cuenta
  cambiarEstado(usuario: Usuario): void {
    usuario.estado = usuario.estado === 'Activo'
      ? 'Inactivo'
      : 'Activo';
  }

  // Limpiar filtros
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroRol = 'Todos';
    this.filtroEstado = 'Todos';
  }

  // Actualizar espacios asignados
  actualizarEspacio(espacio: string, seleccionado: boolean): void {
    if (seleccionado) {
      if (!this.formulario.espaciosAsignados.includes(espacio)) {
        this.formulario.espaciosAsignados.push(espacio);
      }
    } else {
      this.formulario.espaciosAsignados =
        this.formulario.espaciosAsignados.filter(
          item => item !== espacio
        );
    }
  }

  // Consultar si un espacio está seleccionado
  espacioSeleccionado(espacio: string): boolean {
    return this.formulario.espaciosAsignados.includes(espacio);
  }

  // Clases visuales para los roles
  obtenerClaseRol(rol: string): string {
    switch (rol) {
      case 'Docente':
        return 'rol-docente';
      case 'Estudiante':
        return 'rol-estudiante';
      case 'Encargado':
        return 'rol-encargado';
      default:
        return '';
    }
  }
}
