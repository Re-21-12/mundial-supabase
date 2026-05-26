import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  ClientContentService,
  type ClientLeagueGroupView,
} from '../../services/client-content.service';

@Component({
  selector: 'app-mis-grupos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mg-page">
      <div class="mg-header">
        <h2 class="mg-title"><i class="pi pi-users"></i> Mis Grupos</h2>
        <p class="mg-subtitle">Grupos y posiciones de las ligas que creaste como cliente.</p>
      </div>

      @if (loading()) {
        <div class="mg-stack">
          @for (n of [1, 2, 3]; track n) {
            <div class="mg-skeleton"></div>
          }
        </div>
      } @else if (leagues().length === 0) {
        <div class="mg-empty">
          <i class="pi pi-users"></i>
          <p>No hay grupos disponibles para tus ligas todavía.</p>
        </div>
      } @else {
        <div class="mg-stack">
          @for (league of leagues(); track league.league_id) {
            <section class="mg-league-card">
              <div class="mg-league-card__header">
                <div class="mg-league-card__meta">
                  <h3 class="mg-league-card__title">{{ league.league_name }}</h3>
                  <span class="mg-league-card__status">{{
                    league.league_status ?? 'Sin estado'
                  }}</span>
                </div>
              </div>

              <div class="mg-groups-grid">
                @for (grupo of league.grupos; track grupo.grupo_id) {
                  <article class="mg-group-card">
                    <div class="mg-group-card__header">
                      <span class="mg-group-card__letter">{{ grupo.grupo_name }}</span>
                      <span class="mg-group-card__label">Grupo</span>
                    </div>

                    <div class="mg-table-wrap">
                      <table class="mg-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Equipo</th>
                            <th>PJ</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (team of grupo.teams; track team.team_id; let i = $index) {
                            <tr
                              [class.mg-table__row--advances]="team.advances === true"
                              [class.mg-table__row--eliminated]="team.advances === false"
                            >
                              <td>{{ i + 1 }}</td>
                              <td>{{ team.team_name }}</td>
                              <td>{{ team.games_played }}</td>
                              <td>{{ team.points }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mg-page {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .mg-header {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .mg-title {
        font-size: 1.25rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
      }
      .mg-subtitle {
        margin: 0;
        color: var(--muted-foreground);
        font-size: 0.9rem;
      }
      .mg-stack {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .mg-skeleton {
        height: 220px;
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
      .mg-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 200px;
        color: var(--muted-foreground);
      }
      .mg-empty .pi {
        font-size: 2rem;
      }
      .mg-league-card {
        border: 1px solid var(--border);
        border-radius: 1rem;
        background: var(--card);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .mg-league-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .mg-league-card__meta {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .mg-league-card__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
      }
      .mg-league-card__status {
        color: var(--muted-foreground);
        font-size: 0.85rem;
      }
      .mg-groups-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }
      .mg-group-card {
        border: 1px solid var(--border);
        border-radius: 0.875rem;
        padding: 0.875rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .mg-group-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .mg-group-card__letter {
        font-weight: 700;
      }
      .mg-group-card__label {
        color: var(--muted-foreground);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .mg-table-wrap {
        overflow-x: auto;
      }
      .mg-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .mg-table thead th {
        text-align: left;
        padding: 0.45rem 0.5rem;
        color: var(--muted-foreground);
        border-bottom: 1px solid var(--border);
      }
      .mg-table td {
        padding: 0.45rem 0.5rem;
        border-bottom: 1px solid var(--border);
      }
      .mg-table tbody tr:last-child td {
        border-bottom: none;
      }
      .mg-table__row--advances td {
        background: color-mix(in srgb, var(--primary) 8%, transparent);
      }
      .mg-table__row--eliminated td {
        opacity: 0.72;
      }
    `,
  ],
})
export class MisGruposPage implements OnInit {
  private readonly clientContent = inject(ClientContentService);

  protected readonly leagues = signal<ClientLeagueGroupView[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);

    try {
      this.leagues.set(await this.clientContent.loadGroups());
    } catch (error) {
      console.error('[MisGrupos] load error:', error);
      this.leagues.set([]);
    }

    this.loading.set(false);
  }
}
