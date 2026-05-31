import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HeroBannerComponent } from './hero-banner/hero-banner';
import { StatsBarComponent } from './stats-bar/stats-bar';
import { HomeRealtimeService } from './services/home-realtime.service';
import { JoinLeagueComponent } from '../../../shared/components/join-league/join-league.component';
import { TournamentBracketComponent } from '../../../shared/components/tournament-bracket/tournament-bracket';
import { WorldGlobeComponent } from '../../../shared/components/world-globe/world-globe';
import { DigitFlowComponent } from 'ngx-digit-flow';
import { UserLeaguesService } from '../user-league/user-leagues.service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { NotificationService } from '../../../shared/services/notification-service';
import { JoinLeagueService } from '../league/join-league.service';
import { CreateLeagueDialogComponent } from '../../../shared/components/create-league-dialog/create-league-dialog';
import { HomeMatchGridComponent } from './match-grid/home-match-grid';
import type { LeagueForHome } from '../user-league/user-leagues.service';
import type { LeagueDetail } from '../user-league/user-leagues.service';
import type { MatchCard, MatchPeriodRow, GrupoCard } from './models/home.models';
import type { MatchRow, TeamRow } from './models/home.models';
import { LeagueTournamentCardComponent } from './league-tournament-card/league-tournament-card';
import { MatchCalendarComponent } from './match-calendar/match-calendar';

@Component({
  selector: 'app-home',
  imports: [
    HeroBannerComponent,
    StatsBarComponent,
    ButtonModule,
    CommonModule,
    JoinLeagueComponent,
    TournamentBracketComponent,
    WorldGlobeComponent,
    DigitFlowComponent,
    LeagueTournamentCardComponent,
    CreateLeagueDialogComponent,
    MatchCalendarComponent,
    HomeMatchGridComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HomeRealtimeService],
})
export class Home implements OnInit, OnDestroy {
  private readonly realtimeService = inject(HomeRealtimeService);
  private readonly userLeaguesSvc = inject(UserLeaguesService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly notif = inject(NotificationService);
  private readonly joinLeagueSvc = inject(JoinLeagueService);
  private clockTimer: ReturnType<typeof window.setInterval> | null = null;

  // ── Core state ───────────────────────────────────────────────────────────────
  protected readonly showJoinDialog = signal(false);
  protected readonly showCreateLeagueDialog = signal(false);
  protected readonly now = signal(Date.now());
  protected readonly videoUrl = 'https://www.youtube.com/watch?v=Sd1fz57if_I';

  // ── Leagues ──────────────────────────────────────────────────────────────────
  protected readonly homeLeagues = signal<LeagueForHome[]>([]);
  protected readonly leaguesLoading = signal(true);
  protected readonly joiningLeagueId = signal<number | null>(null);

  protected readonly isClientUser = computed(() => {
    const role = this.auth.role()?.toLowerCase();
    return role === 'client' || role === 'cliente';
  });

  // Joined leagues only — used for match filtering and bracket tabs
  readonly joinedLeagues = computed<LeagueForHome[]>(() =>
    this.homeLeagues().filter((l) => l.is_joined),
  );

  // ── League filter ─────────────────────────────────────────────────────────────
  protected readonly showFilter = signal(false);
  protected readonly leagueFilter = signal<string>('all');

  readonly leagueTypes = computed<string[]>(() =>
    [...new Set(this.homeLeagues().map((l) => l.league_type))].filter(
      (t) => !!t && t !== 'Sin tipo',
    ),
  );

  // All leagues filtered by type (for tournament card section)
  readonly filteredHomeLeagues = computed<LeagueForHome[]>(() => {
    const filter = this.leagueFilter();
    return filter === 'all'
      ? this.homeLeagues()
      : this.homeLeagues().filter((l) => l.league_type === filter);
  });

  // Joined leagues filtered by type (for bracket tabs)
  readonly filteredLeagues = computed<LeagueForHome[]>(() => {
    const filter = this.leagueFilter();
    const all = this.joinedLeagues();
    return filter === 'all' ? all : all.filter((l) => l.league_type === filter);
  });

  readonly allowedLeagueIds = computed<Set<number>>(
    () => new Set(this.joinedLeagues().map((l) => l.league_id)),
  );

  // ── League detail (standings) ─────────────────────────────────────────────────
  protected readonly expandedLeagueId = signal<number | null>(null);
  protected readonly loadingDetailId = signal<number | null>(null);
  private readonly detailCache = signal<Map<number, LeagueDetail>>(new Map());

  readonly expandedDetail = computed<LeagueDetail | null>(() => {
    const id = this.expandedLeagueId();
    return id != null ? (this.detailCache().get(id) ?? null) : null;
  });

  // ── Match data ────────────────────────────────────────────────────────────────
  readonly carouselMatches = computed<MatchCard[]>(() =>
    this.buildMatchCards(
      this.realtimeService
        .matches()
        .filter((m) => m.league_id != null && this.allowedLeagueIds().has(m.league_id))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
      this.realtimeService.periods(),
      this.realtimeService.teams(),
      this.homeLeagues(),
    ),
  );

  readonly liveCarouselMatches = computed<MatchCard[]>(() =>
    this.carouselMatches().filter((card) => this.isLiveMatch(card)),
  );

  // ── Torneo (Fase de Grupos + Partidos) ───────────────────────────────────────
  readonly selectedLeagueId = signal<number | null>(null);
  readonly leagueMatchesLoading = computed(() => this.realtimeService.leagueMatchesLoading());

  readonly leagueMatchCards = computed<MatchCard[]>(() =>
    this.buildMatchCards(
      this.realtimeService.leagueMatches().filter((m) => m.grupo_id !== null),
      this.realtimeService.periods(),
      this.realtimeService.teams(),
      this.homeLeagues(),
    ),
  );

  readonly grupos = computed<GrupoCard[]>(() => this.realtimeService.grupos());

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    this.clockTimer = window.setInterval(() => {
      this.now.set(Date.now());
    }, 30000);

    await this.realtimeService.connect();
    const userId = Number(this.auth.getInternalUserId());
    if (userId) {
      const leagues = await this.userLeaguesSvc.loadLeaguesForHome(userId);
      this.homeLeagues.set(leagues);
      const firstJoined = leagues.find((l) => l.is_joined);
      if (firstJoined && this.selectedLeagueId() === null) {
        await this.selectLeague(firstJoined.league_id);
      }
    }
    this.leaguesLoading.set(false);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    this.realtimeService.disconnect();
  }

  // ── League join ───────────────────────────────────────────────────────────────
  async joinLeague(league: LeagueForHome): Promise<void> {
    if (!league.invitation_code) {
      this.notif.notify(
        'warn',
        'Sin código',
        'Esta liga no tiene código de invitación configurado.',
      );
      return;
    }
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) {
      this.notif.notify('error', 'Error', 'Debes iniciar sesión para unirte a una liga.');
      return;
    }

    this.joiningLeagueId.set(league.league_id);
    try {
      const result = await this.joinLeagueSvc.joinByCode(league.invitation_code, userId);
      if (result.error) {
        this.notif.notify('error', 'No se pudo unir', result.error);
      } else {
        this.notif.notify('success', '¡Bienvenido!', `Te has unido a ${league.name}`);
        const leagues = await this.userLeaguesSvc.loadLeaguesForHome(userId);
        const joinedLeagueId = result.leagueId ?? league.league_id;
        this.homeLeagues.set(
          joinedLeagueId
            ? leagues.map((item) =>
                item.league_id === joinedLeagueId ? { ...item, is_joined: true } : item,
              )
            : leagues,
        );
        if (joinedLeagueId && this.selectedLeagueId() === null) {
          await this.selectLeague(joinedLeagueId);
        }
      }
    } finally {
      this.joiningLeagueId.set(null);
    }
  }

  // ── League detail ─────────────────────────────────────────────────────────────
  async toggleLeagueDetail(leagueId: number): Promise<void> {
    if (this.expandedLeagueId() === leagueId) {
      this.expandedLeagueId.set(null);
      return;
    }
    this.expandedLeagueId.set(leagueId);
    if (this.detailCache().has(leagueId)) return;
    this.loadingDetailId.set(leagueId);
    const detail = await this.userLeaguesSvc.loadLeagueDetail(leagueId);
    this.detailCache.update((map) => {
      const next = new Map(map);
      next.set(leagueId, detail);
      return next;
    });
    this.loadingDetailId.set(null);
  }

  isExpanded(leagueId: number): boolean {
    return this.expandedLeagueId() === leagueId;
  }

  isLoadingDetail(leagueId: number): boolean {
    return this.loadingDetailId() === leagueId;
  }

  setMatchView(view: 'grid' | 'bracket' | 'calendar'): void {
    this.matchView.set(view);
  }

  // ── Filter toggle ─────────────────────────────────────────────────────────────
  selectFilter(type: string): void {
    this.leagueFilter.set(type);
    this.showFilter.set(false);
  }

  countByType(type: string): number {
    return this.homeLeagues().filter((l) => l.league_type === type).length;
  }

  // ── Torneo league selection ───────────────────────────────────────────────────
  async selectLeague(leagueId: number): Promise<void> {
    this.selectedLeagueId.set(leagueId);
    await this.realtimeService.loadMatchesForLeague(leagueId);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  navigateToPredict(matchId: number): void {
    this.router.navigate(['/prediction-client', matchId]);
  }

  navigateToCreateLeague(): void {
    this.showCreateLeagueDialog.set(true);
  }

  async onLeagueCreated(leagueId: number): Promise<void> {
    this.showCreateLeagueDialog.set(false);
    const userId = Number(this.auth.getInternalUserId());
    if (userId) {
      const leagues = await this.userLeaguesSvc.loadLeaguesForHome(userId);
      this.homeLeagues.set(leagues);
      await this.selectLeague(leagueId);
    }
  }

  navigateToLeague(leagueId: number): void {
    this.router.navigate(['/league', leagueId, 'standings']);
  }

  openJoinDialog(): void {
    this.showJoinDialog.set(true);
  }

  closeJoinDialog(): void {
    this.showJoinDialog.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  positionEmoji(pos: number): string {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  }

  protected readonly matchView = signal<'grid' | 'bracket' | 'calendar'>('grid');

  private isLiveMatch(card: MatchCard): boolean {
    if (card.match.is_deleted) {
      return false;
    }

    const now = this.now();
    const startTime = new Date(card.match.start_time).getTime();
    const endTime = new Date(card.match.end_time).getTime();

    return (
      Number.isFinite(startTime) && Number.isFinite(endTime) && now >= startTime && now < endTime
    );
  }

  private buildMatchCards(
    matches: MatchRow[],
    periods: MatchPeriodRow[],
    teams: TeamRow[],
    leagues: LeagueForHome[],
  ): MatchCard[] {
    if (!Array.isArray(matches) || !Array.isArray(teams)) return [];
    const teamsMap = new Map(teams.map((t) => [t.team_id, t]));
    const leaguesMap = new Map(leagues.map((league) => [league.league_id, league]));

    const placeholder = (id: number): TeamRow => ({
      team_id: id,
      name: `Equipo ${id}`,
      catalog_id: 0,
      created_at: '',
      created_by: null,
      deleted_at: null,
      deleted_by: null,
      is_deleted: false,
      updated_at: null,
      updated_by: null,
      logo_url: null,
    });

    return matches
      .filter((match) => match.first_team_id !== null && match.second_team_id !== null)
      .map((match) => {
        const period = periods.find((p) => p.match_id === match.match_id);
        const homeTeam =
          teamsMap.get(match.first_team_id!) ?? placeholder(match.first_team_id ?? 0);
        const awayTeam =
          teamsMap.get(match.second_team_id!) ?? placeholder(match.second_team_id ?? 0);
        const leagueName =
          leaguesMap.get(match.league_id)?.name ??
          (match.league_id ? `Liga ${match.league_id}` : 'Liga');
        const now = new Date();
        const isLive =
          new Date(match.start_time) <= now && new Date(match.end_time) > now && !match.is_deleted;
        return { match, homeTeam, awayTeam, leagueName, period, isLive };
      });
  }
}
