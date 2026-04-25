import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import type { MatchCard } from '../models/home.models';

@Component({
  selector: 'app-hero-banner',
  templateUrl: './hero-banner.html',
  styleUrl: './hero-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CarouselModule, TagModule, ButtonModule, CommonModule],
})
export class HeroBannerComponent {
  matches = input<MatchCard[]>([]);

  readonly responsiveOptions = [
    { breakpoint: '1400px', numVisible: 1, numScroll: 1 },
    { breakpoint: '1199px', numVisible: 1, numScroll: 1 },
    { breakpoint: '767px', numVisible: 1, numScroll: 1 },
  ];

  getScore(card: MatchCard): string {
    const p = card.period;
    if (!p) return '- : -';
    return `${p.first_team_score ?? 0} : ${p.second_team_score ?? 0}`;
  }

  getLiveStatus(card: MatchCard): 'success' | 'warn' | 'secondary' {
    return card.isLive ? 'success' : 'secondary';
  }

  getLiveLabel(card: MatchCard): string {
    return card.isLive ? '🔴 En vivo' : '⏰ Próximo';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
