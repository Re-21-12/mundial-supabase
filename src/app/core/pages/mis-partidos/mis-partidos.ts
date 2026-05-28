import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import {
  MatchTicketCardComponent,
  type MatchTicketData,
} from '../../../shared/components/match-ticket-card/match-ticket-card';
import { ClientContentService, type ClientMatchRow } from '../../services/client-content.service';

function matchStatus(row: ClientMatchRow): 'upcoming' | 'live' | 'finished' {
  if (row.scored_at) return 'finished';

  const now = Date.now();
  const start = row.start_time ? new Date(row.start_time).getTime() : null;
  const end = row.end_time ? new Date(row.end_time).getTime() : null;

  if (start && end && now >= start && now <= end) return 'live';
  return 'upcoming';
}

@Component({
  selector: 'app-mis-partidos',
  standalone: true,
  imports: [MatchTicketCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mp-page">
      <div class="mp-header">
        <h2 class="mp-title">
          <i class="pi pi-calendar-clock"></i>
          Mis Partidos
        </h2>
        <div class="mp-filters">
          @for (f of filters; track f.value) {
            <button
              class="mp-filter-btn"
              [class.mp-filter-btn--active]="activeFilter() === f.value"
              type="button"
              (click)="activeFilter.set(f.value)"
            >
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="mp-skeleton-grid">
          @for (n of [1, 2, 3, 4, 5, 6]; track n) {
            <div class="mp-skeleton"></div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="mp-empty">
          <i class="pi pi-inbox"></i>
          <p>No hay partidos en esta categoría.</p>
        </div>
      } @else {
        <div class="mp-grid">
          @for (card of filtered(); track card.matchId) {
            <app-match-ticket-card [card]="card" (predict)="onPredict($event)" />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mp-page {
        padding: clamp(var(--gap-small), 2vw, 1.5rem);
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .mp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .mp-title {
        font-size: 1.25rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
      }

      .mp-filters {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .mp-filter-btn {
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 600;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--muted-foreground);
        cursor: pointer;
        transition: all 0.15s;
      }

      .mp-filter-btn--active,
      .mp-filter-btn:hover {
        background: var(--primary);
        color: var(--primary-foreground);
        border-color: var(--primary);
      }

      .mp-grid,
      .mp-skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .mp-skeleton {
        height: 240px;
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

      .mp-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 200px;
        color: var(--muted-foreground);
        font-size: 0.95rem;
      }

      .mp-empty .pi {
        font-size: 2rem;
      }
    `,
  ],
})
export class MisPartidosPage implements OnInit {
  private readonly router = inject(Router);
  private readonly clientContent = inject(ClientContentService);
  private readonly auth = inject(AuthFacade);

  protected readonly cards = signal<MatchTicketData[]>([]);
  protected readonly loading = signal(true);
  protected readonly activeFilter = signal<'all' | 'upcoming' | 'live' | 'finished'>('all');
  protected readonly isClientUser = computed(() => {
    const role = this.auth.role()?.toLowerCase();
    return role === 'client' || role === 'cliente';
  });

  protected readonly filters = [
    { label: 'Todos', value: 'all' as const },
    { label: 'Próximos', value: 'upcoming' as const },
    { label: 'En vivo', value: 'live' as const },
    { label: 'Finalizados', value: 'finished' as const },
  ];

  protected readonly filtered = computed(() => {
    const filter = this.activeFilter();
    const all = this.cards();
    return filter === 'all' ? all : all.filter((card) => card.status === filter);
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);

    try {
      const rows = await this.clientContent.loadMatches();

      this.cards.set(
        rows.map((row) => {
          const status = matchStatus(row);

          return {
            matchId: row.match_id,
            homeTeam: row.home_team
              ? {
                  id: row.home_team.team_id,
                  name: row.home_team.name,
                  logoUrl: row.home_team.logo_url,
                }
              : { id: 0, name: 'Por definir', logoUrl: null },
            awayTeam: row.away_team
              ? {
                  id: row.away_team.team_id,
                  name: row.away_team.name,
                  logoUrl: row.away_team.logo_url,
                }
              : { id: 0, name: 'Por definir', logoUrl: null },
            startTime: row.start_time,
            endTime: row.end_time,
            homeScore: row.first_team_total,
            awayScore: row.second_team_total,
            stadiumName: row.stadium?.name ?? null,
            leagueName: row.league?.name ?? null,
            status,
            canPredict: status === 'upcoming' && this.isClientUser(),
          };
        }),
      );
    } catch (error) {
      console.error('[MisPartidos] load error:', error);
      this.cards.set([]);
    }

    this.loading.set(false);
  }

  protected onPredict(card: MatchTicketData): void {
    void this.router.navigate(['/prediction'], { queryParams: { matchId: card.matchId } });
  }
}
