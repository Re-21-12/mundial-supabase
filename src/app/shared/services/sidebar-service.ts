import { model, signal } from '@angular/core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  showDrawer = false;

  toggleDrawer() {
    this.showDrawer = !this.showDrawer;
  }
}
