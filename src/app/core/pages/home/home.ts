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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { HeroBannerComponent } from './hero-banner/hero-banner';
import { StatsBarComponent } from './stats-bar/stats-bar';
import { HomeRealtimeService } from './services/home-realtime.service';
import { JoinLeagueComponent } from '../../../shared/components/join-league/join-league.component';
import { TournamentBracketComponent } from '../../../shared/components/tournament-bracket/tournament-bracket';
import { WorldCupGroupsComponent } from '../../../shared/components/world-cup-groups/world-cup-groups';
import { WorldGlobeComponent } from '../../../shared/components/world-globe/world-globe';
import { DigitFlowComponent } from 'ngx-digit-flow';
import { UserLeaguesService } from '../../../core/services/user-leagues.service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import type { UserLeagueCard, LeagueDetail } from '../../../core/services/user-leagues.service';
import type { MatchCard, MatchPeriodRow, GrupoCard } from './models/home.models';
import type { MatchRow, TeamRow } from './models/home.models';

@Component({
  selector: 'app-home',
  imports: [
    HeroBannerComponent,
    StatsBarComponent,
    ButtonModule,
    CardModule,
    TagModule,
    CommonModule,
    JoinLeagueComponent,
    TournamentBracketComponent,
    WorldCupGroupsComponent,
    WorldGlobeComponent,
    DigitFlowComponent,
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

  private readonly sanitizer = inject(DomSanitizer);

  // ── Core state ───────────────────────────────────────────────────────────────
  protected readonly showJoinDialog = signal(false);
  protected readonly safeVideoUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.youtube.com/embed/Sd1fz57if_I?autoplay=1&controls=0&rel=0&loop=1&playlist=Sd1fz57if_I&mute=1&disablekb=1&modestbranding=1',
  );
  protected readonly userLeagues = signal<UserLeagueCard[]>([]);
  protected readonly leaguesLoading = signal(true);
  protected readonly matchView = signal<'grid' | 'bracket'>('grid');

  // ── League filter ─────────────────────────────────────────────────────────────
  protected readonly showFilter = signal(false);
  protected readonly leagueFilter = signal<string>('all');

  readonly leagueTypes = computed<string[]>(() =>
    [...new Set(this.userLeagues().map((l) => l.league_type))].filter(Boolean),
  );

  readonly filteredLeagues = computed<UserLeagueCard[]>(() => {
    const filter = this.leagueFilter();
    return filter === 'all'
      ? this.userLeagues()
      : this.userLeagues().filter((l) => l.league_type === filter);
  });

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
      this.realtimeService.matches(),
      this.realtimeService.periods(),
      this.realtimeService.teams(),
    ),
  );

  readonly featuredMatches = computed<MatchCard[]>(() => this.carouselMatches().slice(0, 6));

  // ── Torneo (Fase de Grupos + Partidos) ───────────────────────────────────────
  readonly selectedLeagueId = signal<number | null>(null);
  readonly leagueMatchesLoading = computed(() => this.realtimeService.leagueMatchesLoading());

  readonly leagueMatchCards = computed<MatchCard[]>(() =>
    this.buildMatchCards(
      this.realtimeService.leagueMatches().filter((m) => m.grupo_id !== null),
      this.realtimeService.periods(),
      this.realtimeService.teams(),
    ),
  );

  readonly grupos = computed<GrupoCard[]>(() => this.realtimeService.grupos());

  // ── Match detail expansion ────────────────────────────────────────────────────
  protected readonly expandedMatchId = signal<number | null>(null);

  toggleMatchDetail(matchId: number): void {
    this.expandedMatchId.update((id) => (id === matchId ? null : matchId));
  }

  isMatchExpanded(matchId: number): boolean {
    return this.expandedMatchId() === matchId;
  }

  getMatchPeriods(matchId: number): MatchPeriodRow[] {
    return this.realtimeService.periods().filter((p) => p.match_id === matchId);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    await this.realtimeService.connect();
    const userId = Number(this.auth.getInternalUserId());
    if (userId) {
      const leagues = await this.userLeaguesSvc.loadUserLeagues(userId);
      this.userLeagues.set(leagues);
      if (leagues.length > 0 && this.selectedLeagueId() === null) {
        await this.selectLeague(leagues[0].league_id);
      }
    }
    this.leaguesLoading.set(false);
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
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

  // ── Filter toggle ─────────────────────────────────────────────────────────────
  selectFilter(type: string): void {
    this.leagueFilter.set(type);
    this.showFilter.set(false);
  }

  countByType(type: string): number {
    return this.userLeagues().filter((l) => l.league_type === type).length;
  }

  // ── Torneo league selection ───────────────────────────────────────────────────
  async selectLeague(leagueId: number): Promise<void> {
    this.selectedLeagueId.set(leagueId);
    await this.realtimeService.loadMatchesForLeague(leagueId);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  navigateToPredict(card: MatchCard): void {
    this.router.navigate(['/prediction/prediction-client', card.match.match_id]);
  }

  navigateToCreateLeague(): void {
    this.router.navigate(['/league']);
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

  getLiveLabel(card: MatchCard): string {
    return card.isLive ? 'En vivo' : ' Próximo';
  }

  getLiveSeverity(card: MatchCard): 'success' | 'secondary' {
    return card.isLive ? 'success' : 'secondary';
  }

  getScore(card: MatchCard): string {
    if (!card.period) return '-  :  -';
    return `${card.match.first_team_total ?? 0}  :  ${card.match.second_team_total ?? 0}`;
  }

  formatMatchDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canPredictMatch(card: MatchCard): boolean {
    const now = new Date();
    const endTime = new Date(card.match.end_time);
    return (endTime.getTime() - now.getTime()) / 60000 > 15;
  }

  private buildMatchCards(
    matches: MatchRow[],
    periods: MatchPeriodRow[],
    teams: TeamRow[],
  ): MatchCard[] {
    if (!Array.isArray(matches) || !Array.isArray(teams)) return [];
    const teamsMap = new Map(teams.map((t) => [t.team_id, t]));

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

    return matches.map((match) => {
      const period = periods.find((p) => p.match_id === match.match_id);
      const homeTeam = teamsMap.get(match.first_team_id!) ?? placeholder(match.first_team_id ?? 0);
      const awayTeam =
        teamsMap.get(match.second_team_id!) ?? placeholder(match.second_team_id ?? 0);
      const isLive = new Date(match.start_time) <= new Date() && !match.is_deleted;
      return { match, homeTeam, awayTeam, period, isLive };
    });
  }
}
