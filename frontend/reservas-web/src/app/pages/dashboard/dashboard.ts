
import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { Sidebar } from '../../shared/sidebar/sidebar';
import { Topbar } from '../../shared/topbar/topbar';

import { Solicitudes } from '../solicitudes/solicitudes';
import { Disponibilidad } from '../disponibilidad/disponibilidad';
import { Espacios } from '../espacios/espacios';
import { Calendario } from '../calendario/calendario';
import { HorariosInstitucionales } from '../horarios-institucionales/horarios-institucionales';
import { ReportesComponent } from '../reportes/reportes';
import { UsuariosComponent } from '../usuarios/usuarios';

type UserRole = 'administrador' | 'docente' | 'estudiante';

interface MenuItem {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    Sidebar,
    Topbar,
    Solicitudes,
    Disponibilidad,
    Espacios,
    Calendario,
    HorariosInstitucionales,
    ReportesComponent,
    UsuariosComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnChanges {

  @Input() isDark = false;

  @Input() userRole: UserRole = 'administrador';

  @Output() toggleThemeEvent = new EventEmitter<void>();
  @Output() closeDashboard = new EventEmitter<void>();

  protected readonly activeModule = signal('Inicio');

  protected readonly roleNames: Record<UserRole, string> = {
    administrador: 'Administrador / Encargado',
    docente: 'Docente',
    estudiante: 'Estudiante'
  };

  protected readonly roleDescriptions: Record<UserRole, string> = {
    administrador: 'Panel de administración institucional',
    docente: 'Panel de gestión de reservas docentes',
    estudiante: 'Panel de gestión de reservas estudiantiles'
  };

  protected readonly menuByRole: Record<UserRole, MenuItem[]> = {
    administrador: [
      { name: 'Inicio', icon: '⌂' },
      { name: 'Solicitudes', icon: '▤' },
      { name: 'Disponibilidad', icon: '◷' },
      { name: 'Calendario', icon: '▦' },
      { name: 'Espacios', icon: '▣' },
      { name: 'Horarios institucionales', icon: '◫' },
      { name: 'Reportes', icon: '▥' },
      { name: 'Gestión de usuarios', icon: '♙' }
    ],

    docente: [
      { name: 'Inicio', icon: '⌂' },
      { name: 'Nueva solicitud', icon: '＋' },
      { name: 'Mis solicitudes', icon: '▤' },
      { name: 'Disponibilidad', icon: '◷' },
      { name: 'Calendario', icon: '▦' }
    ],

    estudiante: [
      { name: 'Inicio', icon: '⌂' },
      { name: 'Nueva solicitud', icon: '＋' },
      { name: 'Mis solicitudes', icon: '▤' },
      { name: 'Disponibilidad', icon: '◷' },
      { name: 'Calendario', icon: '▦' }
    ]
  };

  protected get menuItems(): MenuItem[] {
    return this.menuByRole[this.userRole];
  }

  protected get currentRoleName(): string {
    return this.roleNames[this.userRole];
  }

  protected get currentRoleDescription(): string {
    return this.roleDescriptions[this.userRole];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userRole']) {
      this.activeModule.set('Inicio');
    }
  }

  selectModule(module: string): void {
    this.activeModule.set(module);
  }

  toggleTheme(): void {
    this.toggleThemeEvent.emit();
  }

  closeDashboardPreview(): void {
    this.closeDashboard.emit();
  }
}
