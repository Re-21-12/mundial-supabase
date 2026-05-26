import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ClientContentService } from '../../services/client-content.service';
import {
  ClientCardComponent,
  type ClientCardData,
} from '../../../shared/components/client-card/client-card';

interface StadiumRow {
  stadium_id: number;
  name: string | null;
  logo_url: string | null;
}

@Component({
  selector: 'app-mis-estadios',
  standalone: true,
  imports: [ClientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ms-page">
      <h2 class="ms-title"><i class="pi pi-map-marker"></i> Estadios de mis ligas</h2>

      @if (loading()) {
        <div class="ms-grid">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="ms-skeleton"></div>
          }
        </div>
      } @else if (cards().length === 0) {
        <div class="ms-empty">
          <i class="pi pi-map-marker"></i>
          <p>No hay estadios en tus ligas aún.</p>
        </div>
      } @else {
        <div class="ms-grid">
          @for (card of cards(); track card.id) {
            <app-client-card [card]="card" />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ms-page {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .ms-title {
        font-size: 1.25rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
      }
      .ms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25rem;
      }
      .ms-skeleton {
        height: 200px;
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
      .ms-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 200px;
        color: var(--muted-foreground);
      }
      .ms-empty .pi {
        font-size: 2rem;
      }
    `,
  ],
})
export class MisEstadiosPage implements OnInit {
  private readonly clientContent = inject(ClientContentService);

  protected readonly cards = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);

    try {
      const rows = await this.clientContent.loadStadiums();

      this.cards.set(
        rows.map(
          (r): ClientCardData => ({
            id: r.stadium_id,
            imageUrl: r.logo_url,
            title: r.name ?? 'Estadio sin nombre',
            details: [{ icon: 'pi-map-marker', text: 'Sede oficial' }],
          }),
        ),
      );
    } catch (error) {
      console.error('[MisEstadios] load error:', error);
      this.cards.set([]);
    }

    this.loading.set(false);
  }
}
