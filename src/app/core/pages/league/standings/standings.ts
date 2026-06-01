import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StandingRow, StandingsService } from './standings.service';
import { SendInvitationComponent } from '../../invitation/send-invitation/send-invitation';
import { ApprovalService } from '../approval/approval.service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { SimulateMatchService } from '../../../services/simulate-match.service';
import { NotificationService } from '../../../../shared/services/notification-service';
import { HomeMatchGridComponent } from '../../home/match-grid/home-match-grid';
import { HomeRealtimeService } from '../../home/services/home-realtime.service';
import { SupabaseService } from '../../../services/supabase-service';
import type { MatchCard } from '../../home/models/home.models';

@Component({
  selector: 'app-standings',
  imports: [SendInvitationComponent, RouterLink, HomeMatchGridComponent],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
  providers: [HomeRealtimeService], // requerido por HomeMatchGridComponent
})
export class StandingsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly standingsService = inject(StandingsService);
  private readonly approvalSvc = inject(ApprovalService);
  private readonly auth = inject(AuthFacade);
  private readonly simulateSvc = inject(SimulateMatchService);
  private readonly notif = inject(NotificationService);
  private readonly db = inject(SupabaseService);

  protected readonly standings = signal<StandingRow[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showInvite = signal(false);
  protected readonly isLeagueOwner = signal(false);
  protected readonly pendingCount = signal(0);
  protected readonly simulating = signal(false);
  protected readonly advancing = signal(false);
  protected readonly matchCards = signal<MatchCard[]>([]);
  protected readonly matchCardsLoading = signal(false);

  protected leagueId = 0;

  protected readonly isAdmin = () => (this.auth.role() ?? '').toLowerCase() === 'admin';

  // Puede gestionar la liga: dueño o admin global
  protected readonly canManage = () => this.isLeagueOwner() || this.isAdmin();

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    await Promise.all([this.refresh(), this.loadMatchCards()]);
    this.standingsService.subscribeToChanges(this.leagueId, () => this.refresh());
    await this._checkOwnerAndPending();
  }

  ngOnDestroy() {
    this.standingsService.unsubscribe();
  }

  private async refresh() {
    this.isLoading.set(true);
    const data = await this.standingsService.loadStandings(this.leagueId);
    this.standings.set(data);
    this.isLoading.set(false);
  }

  private async loadMatchCards(): Promise<void> {
    this.matchCardsLoading.set(true);

    const { data } = await this.db.client
      .from('MATCH')
      .select(
        '*, home_team:TEAM!MATCH_first_team_id_fkey(*), away_team:TEAM!MATCH_second_team_id_fkey(*), league:LEAGUE(name)',
      )
      .eq('league_id', this.leagueId)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });

    if (data) {
      const now = Date.now();
      this.matchCards.set(
        (data as any[])
          .filter((m) => m.home_team && m.away_team)
          .map((m) => {
            const start = new Date(m.start_time).getTime();
            const end = new Date(m.end_time).getTime();
            return {
              match: m,
              homeTeam: m.home_team,
              awayTeam: m.away_team,
              leagueName: m.league?.name ?? '',
              isLive: Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end,
            } as MatchCard;
          }),
      );
    }

    this.matchCardsLoading.set(false);
  }

  private async _checkOwnerAndPending() {
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) return;

    const info = await this.approvalSvc.getLeagueInfo(this.leagueId);
    if (info && info.ownerId === userId) {
      this.isLeagueOwner.set(true);
    }

    // Pendientes visibles tanto para dueño como para admin global
    if (this.isLeagueOwner() || this.isAdmin()) {
      const count = await this.approvalSvc.getPendingCount(this.leagueId);
      this.pendingCount.set(count);
    }
  }

  protected async onSimulateMatch(): Promise<void> {
    if (this.simulating()) return;
    this.simulating.set(true);
    const result = await this.simulateSvc.simulateNextMatch(this.leagueId);
    this.simulating.set(false);

    if (result.success) {
      this.notif.notify('success', 'Partido simulado', result.summary ?? '');
      await Promise.all([this.refresh(), this.loadMatchCards()]);
    } else {
      this.notif.notify('warn', 'Sin partidos', result.error ?? 'No hay partidos pendientes.');
    }
  }

  protected async onAdvanceBracket(): Promise<void> {
    if (this.advancing()) return;
    this.advancing.set(true);
    const result = await this.simulateSvc.advanceBracket(this.leagueId);
    this.advancing.set(false);

    if (result.success) {
      this.notif.notify('success', 'Bracket actualizado', result.summary ?? '');
    } else {
      this.notif.notify('error', 'Error', result.error ?? 'No se pudo avanzar el bracket.');
    }
  }
}
