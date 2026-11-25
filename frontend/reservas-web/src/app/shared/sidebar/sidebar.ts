
import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

interface MenuItem {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {

  @Input() items: MenuItem[] = [];

  @Input() activeModule = 'Inicio';

  @Input() userRoleName = 'Usuario';

  @Output() moduleSelected = new EventEmitter<string>();

  @Output() closeDashboard = new EventEmitter<void>();

  selectModule(module: string): void {
    this.moduleSelected.emit(module);
  }

  exitDashboard(): void {
    this.closeDashboard.emit();
  }
}
