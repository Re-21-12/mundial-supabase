import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { HeroBannerComponent } from './hero-banner/hero-banner';
import { StatsBarComponent } from './stats-bar/stats-bar';
import { HomeRealtimeService } from './services/home-realtime.service';
import type { MatchCard, MatchPeriodRow } from './models/home.models';
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
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HomeRealtimeService],
})
export class Home implements OnInit, OnDestroy {
  private readonly realtimeService = inject(HomeRealtimeService);
  private readonly router = inject(Router);

  readonly carouselMatches = computed<MatchCard[]>(() =>
    this.buildMatchCards(
      this.realtimeService.matches(),
      this.realtimeService.periods(),
      this.realtimeService.teams(),
    ),
  );

  readonly featuredMatches = computed<MatchCard[]>(() => this.carouselMatches().slice(0, 6));

  async ngOnInit(): Promise<void> {
    await this.realtimeService.connect();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }

  navigateToPredict(card: MatchCard): void {
    this.router.navigate(['/prediction', card.match.match_id]);
  }

  private buildMatchCards(matches: MatchRow[], periods: MatchPeriodRow[], teams: TeamRow[]): MatchCard[] {
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
    });

    return matches.map((match) => {
      const period = periods.find((p) => p.match_id === match.match_id);
      const homeTeam = teamsMap.get(match.first_team_id) ?? placeholder(match.first_team_id);
      const awayTeam = teamsMap.get(match.second_team_id) ?? placeholder(match.second_team_id);
      const isLive = new Date(match.start_time) <= new Date() && !match.is_deleted;
      return { match, homeTeam, awayTeam, period, isLive };
    });
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

  getLiveLabel(card: MatchCard): string {
    return card.isLive ? 'En vivo' : ' Próximo';
  }

  getLiveSeverity(card: MatchCard): 'success' | 'secondary' {
    return card.isLive ? 'success' : 'secondary';
  }

  getScore(card: MatchCard): string {
    if (!card.period) return '-  :  -';
    return `${card.period.first_team_score ?? 0}  :  ${card.period.second_team_score ?? 0}`;
  }
}
