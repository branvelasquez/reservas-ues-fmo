
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { Sidebar } from '../../shared/sidebar/sidebar';
import { Topbar } from '../../shared/topbar/topbar';

import { Solicitudes } from '../solicitudes/solicitudes';
import { Disponibilidad } from '../disponibilidad/disponibilidad';
import { Espacios } from '../espacios/espacios';
import { Calendario } from '../calendario/calendario';
import { HorariosInstitucionales } from '../horarios-institucionales/horarios-institucionales';

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
    HorariosInstitucionales
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  @Input() isDark = false;

  @Output() toggleThemeEvent = new EventEmitter<void>();
  @Output() closeDashboard = new EventEmitter<void>();

  protected readonly activeModule = signal('Inicio');

  protected readonly menuItems = [
    { name: 'Inicio', icon: '⌂' },
    { name: 'Solicitudes', icon: '▤' },
    { name: 'Disponibilidad', icon: '◷' },
    { name: 'Calendario', icon: '▦' },
    { name: 'Espacios', icon: '▣' },
    { name: 'Horarios institucionales', icon: '◫' },
    { name: 'Reportes', icon: '▥' }
  ];

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
