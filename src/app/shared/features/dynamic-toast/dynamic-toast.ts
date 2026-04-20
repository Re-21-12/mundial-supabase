import { Component } from '@angular/core';
import { ToastModule } from 'primeng/toast';
@Component({
  selector: 'app-dynamic-toast',
  standalone: true,
  imports: [ToastModule],
  template: `<p-toast [breakpoints]="{ '920px': { width: '50%' } }" />`,
  // providers: [MessageService] <-- ELIMINA ESTA LÍNEA
})
export class DynamicToast {}
