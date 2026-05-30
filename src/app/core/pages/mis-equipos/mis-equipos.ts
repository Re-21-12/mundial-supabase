import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ClientContentService } from '../../services/client-content.service';
import {
  ClientCardComponent,
  type ClientCardData,
} from '../../../shared/components/client-card/client-card';

interface TeamRow {
  team_id: number;
  name: string;
  logo_url: string | null;
}

@Component({
  selector: 'app-mis-equipos',
  standalone: true,
  imports: [ClientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="me-page">
      <h2 class="me-title"><i class="pi pi-shield"></i> Equipos de mis ligas</h2>

      @if (loading()) {
        <div class="me-grid">
          @for (n of [1, 2, 3, 4, 5, 6]; track n) {
            <div class="me-skeleton"></div>
          }
        </div>
      } @else if (cards().length === 0) {
        <div class="me-empty">
          <i class="pi pi-shield"></i>
          <p>No hay equipos en tus ligas aún.</p>
        </div>
      } @else {
        <div class="me-grid">
          @for (card of cards(); track card.id) {
            <app-client-card [card]="card" />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .me-page {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .me-title {
        font-size: 1.25rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
      }
      .me-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1.25rem;
      }
      .me-skeleton {
        height: 180px;
        border-radius: 20px;
        background: var(--card);
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.45;
        }
      }
      .me-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 200px;
        color: #64748b;
      }
      .me-empty .pi {
        font-size: 2rem;
      }
    `,
  ],
})
export class MisEquiposPage implements OnInit {
  private readonly clientContent = inject(ClientContentService);

  protected readonly cards = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);

    try {
      const rows = await this.clientContent.loadTeams();

      this.cards.set(
        rows.map(
          (r): ClientCardData => ({
            id: r.team_id,
            imageUrl: r.logo_url,
            title: r.name,
          }),
        ),
      );
    } catch (error) {
      console.error('[MisEquipos] load error:', error);
      this.cards.set([]);
    }

    this.loading.set(false);
  }
}
