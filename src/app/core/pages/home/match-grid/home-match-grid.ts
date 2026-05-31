import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DigitFlowComponent } from 'ngx-digit-flow';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { HomeRealtimeService } from '../services/home-realtime.service';
import type { MatchCard, MatchPeriodRow } from '../models/home.models';

interface LeagueFilterOption {
  league_id: number | null;
  league_name: string;
}

@Component({
  selector: 'app-home-match-grid',
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule, DigitFlowComponent],
  templateUrl: './home-match-grid.html',
  styleUrl: './home-match-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeMatchGridComponent implements OnInit, OnDestroy {
  private readonly realtimeService = inject(HomeRealtimeService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly cards = input<MatchCard[]>([]);
  protected readonly PAGE_SIZE = 6;
  protected readonly now = signal(Date.now());
  protected readonly matchPage = signal(0);
  protected readonly expandedMatchId = signal<number | null>(null);
  protected readonly selectedLeagueId = signal<number | null>(null);
  private clockTimer: ReturnType<typeof window.setInterval> | null = null;

  protected readonly hasLeagueFilter = computed(() => this.leagueOptions().length > 1);

  protected readonly isClientUser = computed(() => {
    const role = this.auth.role()?.toLowerCase();
    return role === 'client' || role === 'cliente';
  });

  readonly leagueOptions = computed<LeagueFilterOption[]>(() => {
    const leagues = new Map<number, string>();

    for (const card of this.cards()) {
      leagues.set(card.match.league_id ?? 0, card.leagueName);
    }

    return [
      { league_id: null, league_name: 'Todas las ligas' },
      ...[...leagues.entries()]
        .filter(([leagueId]) => leagueId !== 0)
        .map(([leagueId, leagueName]) => ({
          league_id: leagueId,
          league_name: leagueName,
        }))
        .sort((a, b) => a.league_name.localeCompare(b.league_name, 'es')),
    ];
  });

  readonly totalMatchPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCards().length / this.PAGE_SIZE)),
  );

  readonly currentPage = computed(() => Math.min(this.matchPage(), this.totalMatchPages() - 1));

  readonly pagedCards = computed<MatchCard[]>(() => {
    const start = this.currentPage() * this.PAGE_SIZE;
    return this.filteredCards().slice(start, start + this.PAGE_SIZE);
  });

  readonly sortedCards = computed<MatchCard[]>(() =>
    [...this.cards()].sort(
      (a, b) => new Date(b.match.start_time).getTime() - new Date(a.match.start_time).getTime(),
    ),
  );

  readonly filteredCards = computed<MatchCard[]>(() => {
    const selectedLeagueId = this.selectedLeagueId();
    const cards = this.sortedCards();

    if (selectedLeagueId === null) {
      return cards;
    }

    return cards.filter((card) => card.match.league_id === selectedLeagueId);
  });

  ngOnInit(): void {
    this.clockTimer = window.setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  toggleMatchDetail(matchId: number): void {
    this.expandedMatchId.update((id) => (id === matchId ? null : matchId));
  }

  isMatchExpanded(matchId: number): boolean {
    return this.expandedMatchId() === matchId;
  }

  getMatchPeriods(matchId: number): MatchPeriodRow[] {
    return this.realtimeService.periods().filter((period) => period.match_id === matchId);
  }

  goNextPage(): void {
    this.matchPage.update((page) => Math.min(page + 1, this.totalMatchPages() - 1));
  }

  goPrevPage(): void {
    this.matchPage.update((page) => Math.max(page - 1, 0));
  }

  onLeagueChange(leagueId: number | null): void {
    this.selectedLeagueId.set(leagueId);
    this.matchPage.set(0);
    this.expandedMatchId.set(null);
  }

  getLiveLabel(card: MatchCard): string {
    const state = this.resolveMatchState(card);
    if (state === 'live') return 'En vivo';
    if (state === 'finished') return 'Finalizado';
    return 'Próximo';
  }

  getLiveSeverity(card: MatchCard): 'success' | 'secondary' {
    return this.resolveMatchState(card) === 'live' ? 'success' : 'secondary';
  }

  getScore(card: MatchCard): string {
    if (!card.period) return '-  :  -';
    return `${card.match.first_team_total ?? 0}  :  ${card.match.second_team_total ?? 0}`;
  }

  formatMatchDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getRoundLabel(card: MatchCard): string {
    if (card.match.grupo_id !== null) {
      return 'Fase de grupos';
    }

    const labels: Record<number, string> = {
      1: 'Dieciseisavos',
      2: 'Octavos',
      3: 'Cuartos de final',
      4: 'Semifinal',
      5: 'Final',
    };

    return card.match.round !== null
      ? (labels[card.match.round] ?? `Ronda ${card.match.round}`)
      : '';
  }

  canPredictMatch(card: MatchCard): boolean {
    const startTime = new Date(card.match.start_time);
    const differenceInMs = startTime.getTime() - this.now();
    const differenceInMinutes = differenceInMs / (1000 * 60);
    return differenceInMinutes >= 15;
  }

  getElapsedTime(startTime: string): { minutes: number; seconds: number } {
    const elapsedMs = Math.max(0, this.now() - new Date(startTime).getTime());
    return {
      minutes: Math.floor(elapsedMs / 60000),
      seconds: Math.floor((elapsedMs % 60000) / 1000),
    };
  }

  navigateToPredict(matchId: number): void {
    void this.router.navigate(['/prediction-client', matchId]);
  }

  protected resolveMatchState(card: MatchCard): 'upcoming' | 'live' | 'finished' {
    if (card.match.is_deleted) {
      return 'finished';
    }

    const now = this.now();
    const startTime = new Date(card.match.start_time).getTime();
    const endTime = new Date(card.match.end_time).getTime();

    if (Number.isFinite(endTime) && now >= endTime) {
      return 'finished';
    }

    if (
      Number.isFinite(startTime) &&
      Number.isFinite(endTime) &&
      now >= startTime &&
      now < endTime
    ) {
      return 'live';
    }

    if (Number.isFinite(startTime) && now < startTime) {
      return 'upcoming';
    }

    return card.isLive ? 'live' : 'finished';
  }
}
