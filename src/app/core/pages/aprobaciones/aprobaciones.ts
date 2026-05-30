import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { ApprovalPanelComponent } from '../../../shared/components/approval-panel/approval-panel.component';
import { ApprovalService } from '../league/approval.service';

interface ApprovalLeagueRow {
  league_id: number;
  name: string;
  pendingCount: number;
}

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [ApprovalPanelComponent],
  template: `
    <div class="apv-page">

      <!-- Header -->
      <header class="apv-header">
        <h2 class="apv-title">
          <i class="pi pi-shield"></i> Aprobaciones
        </h2>
        <p class="apv-subtitle">
          Gestiona las solicitudes de ingreso a las ligas que administras.
        </p>
      </header>

      <!-- Loading -->
      @if (loading()) {
        <div class="apv-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando tus ligas…</span>
        </div>
      }

      <!-- Sin ligas -->
      @else if (leagues().length === 0) {
        <div class="apv-empty">
          <i class="pi pi-trophy"></i>
          <p class="apv-empty__title">Sin ligas propias</p>
          <p class="apv-empty__hint">
            Crea una liga para que otros usuarios puedan solicitar unirse y tú puedas aprobarlos.
          </p>
        </div>
      }

      @else {
        <!-- League tabs -->
        <div class="apv-tabs" role="tablist" aria-label="Seleccionar liga">
          @for (league of leagues(); track league.league_id) {
            <button
              type="button"
              role="tab"
              class="apv-tab"
              [class.apv-tab--active]="selectedLeagueId() === league.league_id"
              [attr.aria-selected]="selectedLeagueId() === league.league_id"
              (click)="selectLeague(league.league_id)">
              <i class="pi pi-trophy"></i>
              <span>{{ league.name }}</span>
              @if (league.pendingCount > 0) {
                <span class="apv-tab__badge">{{ league.pendingCount }}</span>
              }
            </button>
          }
        </div>

        <!-- Panel for selected league -->
        @if (selectedLeague(); as lg) {
          <div class="apv-panel-wrap">
            <div class="apv-panel-header">
              <span class="apv-panel-title">
                Solicitudes pendientes
                @if (lg.pendingCount > 0) {
                  <span class="apv-pending-count">{{ lg.pendingCount }}</span>
                }
              </span>
              <span class="apv-panel-league">{{ lg.name }}</span>
            </div>
            <div class="apv-panel-body">
              <app-approval-panel
                [leagueId]="lg.league_id"
                [leagueName]="lg.name"
                (approvedOrRejected)="decrementCount(lg.league_id)"
              />
            </div>
          </div>
        }
      }

    </div>
  `,
  styles: [`
    .apv-page {
      max-width: 780px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Header */
    .apv-title {
      margin: 0 0 0.2rem;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-color, #1e293b);
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .apv-title .pi { color: var(--primary-color, #6366f1); }
    .apv-subtitle {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-color-secondary, #64748b);
    }

    /* Loading */
    .apv-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      padding: 3rem 1rem;
      color: var(--text-color-secondary, #64748b);
      font-size: 0.875rem;
    }

    /* Empty */
    .apv-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 3.5rem 1.5rem;
      text-align: center;
    }
    .apv-empty .pi-trophy {
      font-size: 2.5rem;
      color: var(--text-color-secondary, #94a3b8);
      margin-bottom: 0.25rem;
    }
    .apv-empty__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color, #1e293b);
      margin: 0;
    }
    .apv-empty__hint {
      font-size: 0.82rem;
      color: var(--text-color-secondary, #64748b);
      max-width: 24rem;
      margin: 0;
      line-height: 1.5;
    }

    /* Tabs */
    .apv-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      border-bottom: 1px solid var(--surface-border, #e2e8f0);
      padding-bottom: 0.25rem;
    }
    .apv-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 1rem;
      border: none;
      border-radius: 0.5rem 0.5rem 0 0;
      background: none;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-color-secondary, #64748b);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .apv-tab:hover {
      background: var(--surface-hover, #f1f5f9);
      color: var(--text-color, #1e293b);
    }
    .apv-tab--active {
      background: var(--primary-color, #6366f1);
      color: #fff;
      font-weight: 600;
    }
    .apv-tab .pi { font-size: 0.8rem; }
    .apv-tab__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.2rem;
      height: 1.2rem;
      padding: 0 0.3rem;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .apv-tab--active .apv-tab__badge {
      background: rgba(255,255,255,0.3);
    }

    /* Panel */
    .apv-panel-wrap {
      border: 1px solid var(--surface-border, #e2e8f0);
      border-radius: 0.75rem;
      overflow: hidden;
      background: var(--surface-card, #fff);
    }
    .apv-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid var(--surface-border, #e2e8f0);
      background: var(--surface-section, #f8fafc);
    }
    .apv-panel-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-color, #1e293b);
    }
    .apv-pending-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.35rem;
      height: 1.35rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .apv-panel-league {
      font-size: 0.78rem;
      color: var(--text-color-secondary, #64748b);
    }
    .apv-panel-body {
      padding: 1rem 1.25rem 1.25rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobacionesPage implements OnInit {
  private readonly db      = inject(SupabaseService);
  private readonly auth    = inject(AuthFacade);
  private readonly approval = inject(ApprovalService);

  protected readonly loading          = signal(true);
  protected readonly leagues          = signal<ApprovalLeagueRow[]>([]);
  protected readonly selectedLeagueId = signal<number | null>(null);

  protected readonly selectedLeague = () =>
    this.leagues().find((l) => l.league_id === this.selectedLeagueId()) ?? null;

  async ngOnInit(): Promise<void> {
    await this.loadLeagues();
  }

  protected selectLeague(id: number): void {
    this.selectedLeagueId.set(id);
  }

  protected decrementCount(leagueId: number): void {
    this.leagues.update((list) =>
      list.map((l) =>
        l.league_id === leagueId
          ? { ...l, pendingCount: Math.max(0, l.pendingCount - 1) }
          : l,
      ),
    );
  }

  private async loadLeagues(): Promise<void> {
    this.loading.set(true);
    try {
      const userId  = Number(this.auth.getInternalUserId());
      const role    = this.auth.role()?.toLowerCase();
      const isAdmin = role === 'admin';
      if (!userId) { this.leagues.set([]); return; }

      const query = this.db.client
        .from('LEAGUE')
        .select('league_id, name, created_by')
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      const { data, error } = isAdmin ? await query : await query.eq('created_by', userId);
      if (error) throw error;

      const rows = (data ?? []) as { league_id: number; name: string }[];

      // Load pending counts in parallel
      const counts = await Promise.all(
        rows.map((r) => this.approval.getPendingCount(r.league_id)),
      );

      this.leagues.set(
        rows.map((r, i) => ({ ...r, pendingCount: counts[i] })),
      );

      // Auto-select: prefer league with pending requests, else first
      const withPending = this.leagues().find((l) => l.pendingCount > 0);
      this.selectedLeagueId.set(
        (withPending ?? this.leagues()[0])?.league_id ?? null,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
