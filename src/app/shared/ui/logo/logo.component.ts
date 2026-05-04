import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.css'
})
export class LogoComponent {
  // 'default' (dark green), 'light' (white), 'secondary' (brown)
  variant = input<'default' | 'light' | 'secondary'>('default');
  
  // Custom size in rem
  size = input<string>('1.875rem');
}
