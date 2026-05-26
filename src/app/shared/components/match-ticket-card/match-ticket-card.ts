import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MatchTicketTeam {
  id: number;
  name: string;
  logoUrl?: string | null;
}

export interface MatchTicketData {
  matchId: number;
  homeTeam: MatchTicketTeam;
  awayTeam: MatchTicketTeam;
  startTime: string | null;
  endTime: string | null;
  homeScore: number;
  awayScore: number;
  stadiumName?: string | null;
  leagueName?: string | null;
  status: 'upcoming' | 'live' | 'finished';
  canPredict?: boolean;
}

@Component({
  selector: 'app-match-ticket-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match-ticket-card.html',
  styleUrl: './match-ticket-card.css',
})
export class MatchTicketCardComponent {
  readonly card = input.required<MatchTicketData>();
  readonly predict = output<MatchTicketData>();

  protected readonly statusLabel = computed(() => {
    const s = this.card().status;
    return s === 'live' ? 'EN VIVO' : s === 'upcoming' ? 'Próximo' : 'Finalizado';
  });

  protected readonly dateLabel = computed(() => {
    const t = this.card().startTime;
    if (!t) return '—';
    const d = new Date(t);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  protected readonly timeLabel = computed(() => {
    const t = this.card().startTime;
    if (!t) return '';
    return new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  });

  protected readonly hasScore = computed(
    () => this.card().status !== 'upcoming',
  );

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  }

  protected onPredict(): void {
    this.predict.emit(this.card());
  }
}
