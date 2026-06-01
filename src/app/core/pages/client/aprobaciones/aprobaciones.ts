import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ApprovalPanelComponent } from '../../../../shared/components/approval-panel/approval-panel.component';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { SupabaseService } from '../../../services/supabase-service';
import { ApprovalService } from '../../league/approval/approval.service';

interface ApprovalLeagueRow {
  league_id: number;
  name: string;
  pendingCount: number;
}

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [ApprovalPanelComponent],
  templateUrl: './aprobaciones.html',
  styleUrls: ['./aprobaciones.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobacionesPage implements OnInit {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);
  private readonly approval = inject(ApprovalService);

  protected readonly loading = signal(true);
  protected readonly leagues = signal<ApprovalLeagueRow[]>([]);
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
        l.league_id === leagueId ? { ...l, pendingCount: Math.max(0, l.pendingCount - 1) } : l,
      ),
    );
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
      if (error) throw error;

      const rows = (data ?? []) as { league_id: number; name: string }[];

      // Load pending counts in parallel
      const counts = await Promise.all(rows.map((r) => this.approval.getPendingCount(r.league_id)));

      this.leagues.set(rows.map((r, i) => ({ ...r, pendingCount: counts[i] })));

      // Auto-select: prefer league with pending requests, else first
      const withPending = this.leagues().find((l) => l.pendingCount > 0);
      this.selectedLeagueId.set((withPending ?? this.leagues()[0])?.league_id ?? null);
    } finally {
      this.loading.set(false);
    }
  }
}
