import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HttpLoadingService } from './core/services/http-loading-service';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ProgressSpinnerModule, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly loadingService = inject(HttpLoadingService);
}
