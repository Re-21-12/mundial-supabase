import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { HeroBannerComponent } from './hero-banner/hero-banner';
import { StatsBarComponent } from './stats-bar/stats-bar';
import { HomeRealtimeService } from './services/home-realtime.service';
import type { MatchCard, MatchPeriodRow } from './models/home.models';
import type { MatchRow, TeamRow } from './models/home.models';

const COMPONENTS = [
  HeroBannerComponent,
  StatsBarComponent,
  ButtonModule,
  CardModule,
  TagModule,
  CommonModule,
];

@Component({
  selector: 'app-home',
  imports: COMPONENTS,
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HomeRealtimeService],
})
export class Home implements OnInit, OnDestroy {
  private readonly realtimeService = inject(HomeRealtimeService);

  /** Builds MatchCard[] from realtime signals */
  readonly carouselMatches = computed<MatchCard[]>(() => {
    return this.buildMatchCards(this.realtimeService.matches(), this.realtimeService.periods());
  });

  readonly featuredMatches = computed<MatchCard[]>(() => this.carouselMatches().slice(0, 6));

  async ngOnInit(): Promise<void> {
    await this.realtimeService.connect();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }

  private buildMatchCards(matches: MatchRow[], periods: MatchPeriodRow[]): MatchCard[] {
    const matchesMap = matches.map((match) => {
      const period = periods.find((p) => p.match_id === match.match_id);
      const homeTeam: TeamRow = {
        team_id: match.first_team_id,
        name: `Equipo ${match.first_team_id}`,
        catalog_id: 0,
        created_at: '',
        created_by: null,
        deleted_at: null,
        is_deleted: false,
        updated_at: null,
        deleted_by: null,
        updated_by: null,
      };
      const awayTeam: TeamRow = {
        team_id: match.second_team_id,
        name: `Equipo ${match.second_team_id}`,
        catalog_id: 0,
        created_at: '',
        created_by: null,
        deleted_by: null,
        deleted_at: null,
        is_deleted: false,
        updated_at: null,
        updated_by: null,
      };
      const startTime = new Date(match.start_time);
      const isLive = startTime <= new Date() && !match.is_deleted;
      return { match, homeTeam, awayTeam, period, isLive };
    });
    console.log('matchesMap', JSON.stringify(matchesMap));
    return matchesMap;
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
