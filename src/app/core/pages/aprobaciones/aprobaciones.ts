import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { ApprovalPanelComponent } from '../../../shared/components/approval-panel/approval-panel.component';

interface ApprovalLeagueRow {
  league_id: number;
  name: string;
  created_by: number | null;
}

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [CommonModule, ApprovalPanelComponent],
  template: `
    <div class="apv-page">
      <header class="apv-header">
        <h2 class="apv-title">Aprobaciones</h2>
        <p class="apv-subtitle">Revisa las solicitudes de ingreso de las ligas que administras.</p>
      </header>

      @if (loading()) {
        <div class="apv-empty">Cargando ligas…</div>
      } @else if (leagues().length === 0) {
        <div class="apv-empty">No tienes ligas para aprobar todavía.</div>
      } @else {
        <div class="apv-tabs" role="tablist" aria-label="Seleccionar liga">
          @for (league of leagues(); track league.league_id) {
            <button
              type="button"
              class="apv-tab"
              [class.apv-tab--active]="selectedLeagueId() === league.league_id"
              (click)="selectedLeagueId.set(league.league_id)"
            >
              {{ league.name }}
            </button>
          }
        </div>

        @if (selectedLeagueId(); as leagueId) {
          <app-approval-panel [leagueId]="leagueId" />
        }
      }
    </div>
  `,
  styles: [
    `
      .apv-page {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        max-width: 1040px;
        margin: 0 auto;
      }

      .apv-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .apv-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--foreground);
      }

      .apv-subtitle {
        margin: 0;
        color: var(--muted-foreground);
        font-size: 0.92rem;
      }

      .apv-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .apv-tab {
        border: 1px solid var(--border);
        background: var(--card);
        color: var(--foreground);
        border-radius: 999px;
        padding: 0.55rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
        transition:
          border-color 0.15s,
          background 0.15s;
      }

      .apv-tab--active {
        border-color: var(--primary);
        background: color-mix(in oklch, var(--primary) 10%, var(--card));
      }

      .apv-empty {
        border: 1px dashed var(--border);
        border-radius: var(--radius);
        background: var(--card);
        padding: 1.25rem;
        color: var(--muted-foreground);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobacionesPage implements OnInit {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);

  protected readonly loading = signal(true);
  protected readonly leagues = signal<ApprovalLeagueRow[]>([]);
  protected readonly selectedLeagueId = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadLeagues();
  }

  private async loadLeagues(): Promise<void> {
    this.loading.set(true);
    try {
      const userId = Number(this.auth.getInternalUserId());
      const role = this.auth.role()?.toLowerCase();
      const isAdmin = role === 'admin';

      if (!userId) {
        this.leagues.set([]);
        return;
      }

      const query = this.db.client
        .from('LEAGUE')
        .select('league_id, name, created_by')
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      const { data, error } = isAdmin ? await query : await query.eq('created_by', userId);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as ApprovalLeagueRow[];
      this.leagues.set(rows);
      this.selectedLeagueId.set(rows[0]?.league_id ?? null);
    } finally {
      this.loading.set(false);
    }
  }
}
