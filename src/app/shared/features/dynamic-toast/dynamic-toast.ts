import { Component } from '@angular/core';
import { ToastModule } from 'primeng/toast';
@Component({
  selector: 'app-dynamic-toast',
  standalone: true,
  imports: [ToastModule],
  templateUrl: './dynamic-toast.html',
  styleUrl: './dynamic-toast.css',
  // providers: [MessageService] <-- ELIMINA ESTA LÍNEA
})
export class DynamicToast {}
