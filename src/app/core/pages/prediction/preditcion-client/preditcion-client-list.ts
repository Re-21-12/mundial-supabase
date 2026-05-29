import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PredictionClientService } from './prediction-client.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-preditcion-client-list',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  templateUrl: './preditcion-client-list.html',
  styleUrl: './preditcion-client-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreditcionClientList implements OnInit {
  private readonly svc = inject(PredictionClientService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly leagues = signal<Array<any>>([]);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.svc.listLeaguesWithUpcomingMatches();
      this.leagues.set(list);
    } catch (e) {
      this.error.set('No se pudieron cargar tus ligas.');
    }
    this.loading.set(false);
  }

  goToMatch(matchId: number): void {
    this.router.navigate(['/prediction-client', matchId]);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
