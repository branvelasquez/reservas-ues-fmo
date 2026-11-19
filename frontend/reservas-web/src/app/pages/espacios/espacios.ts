
import { Component, computed, signal } from '@angular/core';

interface Espacio {
  id: number;
  nombre: string;
  tipo: 'Laboratorio' | 'Aula de cómputo';
  ubicacion: string;
  encargado: string;
  estado: 'Identificado' | 'Pendiente de confirmar';
}

@Component({
  selector: 'app-espacios',
  standalone: true,
  imports: [],
  templateUrl: './espacios.html',
  styleUrl: './espacios.css'
})
export class Espacios {

  protected readonly busqueda = signal('');
  protected readonly filtroTipo = signal('Todos');

  protected readonly espacios: Espacio[] = [
    {
      id: 1,
      nombre: 'Laboratorio de Física',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Por confirmar',
      estado: 'Identificado'
    },
    {
      id: 2,
      nombre: 'Laboratorio de Química',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Por confirmar',
      estado: 'Identificado'
    },
    {
      id: 3,
      nombre: 'Laboratorio de Industrial',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Por confirmar',
      estado: 'Identificado'
    },
    {
      id: 4,
      nombre: 'Laboratorio de Biología',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
      encargado: 'Por confirmar',
      estado: 'Identificado'
    },
    {
      id: 5,
      nombre: 'Laboratorio de Realidad Virtual',
      tipo: 'Laboratorio',
      ubicacion: 'Por confirmar',
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

  protected readonly espaciosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const tipo = this.filtroTipo();

    return this.espacios.filter(espacio => {
      const coincideTexto =
        espacio.nombre.toLowerCase().includes(texto) ||
        espacio.ubicacion.toLowerCase().includes(texto) ||
        espacio.tipo.toLowerCase().includes(texto);

      const coincideTipo =
        tipo === 'Todos' || espacio.tipo === tipo;

      return coincideTexto && coincideTipo;
    });
  });

  protected readonly totalLaboratorios = computed(
    () => this.espacios.filter(e => e.tipo === 'Laboratorio').length
  );

  protected readonly totalAulas = computed(
    () => this.espacios.filter(e => e.tipo === 'Aula de cómputo').length
  );

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
}
