
import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar {

  @Input() activeModule = 'Inicio';

  @Input() isDark = false;

  @Output() toggleTheme = new EventEmitter<void>();

  changeTheme(): void {
    this.toggleTheme.emit();
  }
}
