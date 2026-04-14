import { Component, inject } from '@angular/core';
import { SidebarService } from '../../services/sidebar-service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-header',
  imports: [ButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  sidebarService = inject(SidebarService);
}
