import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LeagueForHome } from '../../user-league/user-leagues.service';

@Component({
  selector: 'app-league-tournament-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './league-tournament-card.html',
  styleUrls: ['./league-tournament-card.css'],
})
export class LeagueTournamentCardComponent {
  readonly league = input.required<LeagueForHome>();
  readonly joining = input(false);
  readonly join = output<void>();
  readonly navigate = output<void>();

  protected readonly bannerInitial = computed(() => (this.league().name[0] ?? '?').toUpperCase());

  protected readonly bannerBackground = computed(() => {
    if (this.league().logo_url) return null;
    const hue = Math.round((this.league().name.charCodeAt(0) * 137.5) % 360);
    const hue2 = (hue + 60) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 45%, 20%), hsl(${hue2}, 35%, 13%))`;
  });

  protected readonly statusLabel = computed(() => {
    switch (this.league().status) {
      case 'active':
        return 'Activa';
      case 'draft':
        return 'Próximamente';
      case 'inactive':
        return 'Pausada';
      case 'finished':
        return 'Finalizada';
      default:
        return this.league().status ?? 'Sin estado';
    }
  });

  protected readonly statusChipClass = computed(() => {
    switch (this.league().status) {
      case 'active':
        return 'tc-chip tc-chip--active';
      case 'draft':
        return 'tc-chip tc-chip--draft';
      case 'inactive':
        return 'tc-chip tc-chip--inactive';
      case 'finished':
        return 'tc-chip tc-chip--finished';
      default:
        return 'tc-chip tc-chip--inactive';
    }
  });

  protected readonly canJoin = computed(
    () =>
      !this.league().is_joined &&
      this.league().approval_status !== 'pending_approval' &&
      this.league().approval_status !== 'rejected' &&
      (this.league().status === 'active' || this.league().status === 'draft') &&
      !!this.league().invitation_code,
  );

  protected readonly joinLabel = computed(() => {
    const amt = this.league().buy_in_amount;
    return amt > 0 ? `Unirse · $${amt} Q` : 'Unirse gratis';
  });

  protected readonly positionEmoji = computed(() => {
    const pos = this.league().position;
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  });
}
