import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { LeagueForHome } from '../../../core/pages/user-league/user-leagues.service';

@Component({
  selector: 'app-league-tournament-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tc-card" [class.tc-card--joined]="league().is_joined">
      <!-- Banner -->
      <div class="tc-banner" [style.background]="bannerBackground()">
        @if (league().logo_url) {
          <img
            class="tc-banner__img"
            [src]="league().logo_url"
            [alt]="league().name"
            loading="lazy"
          />
        } @else {
          <span class="tc-banner__initial">{{ bannerInitial() }}</span>
        }
        <div class="tc-banner__overlay"></div>
        <div class="tc-banner__bottom">
          <h3 class="tc-banner__title">{{ league().name }}</h3>
          <div class="tc-chips">
            <span class="tc-chip" [class]="statusChipClass()">{{ statusLabel() }}</span>
            @if (league().league_type && league().league_type !== 'Sin tipo') {
              <span class="tc-chip tc-chip--type">{{ league().league_type }}</span>
            }
            @if (league().buy_in_amount > 0) {
              <span class="tc-chip tc-chip--prize">$ {{ league().buy_in_amount }}</span>
            }
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="tc-body">
        @if (league().league_type_desc) {
          <p class="tc-desc">{{ league().league_type_desc }}</p>
        }

        <div class="tc-metrics">
          <div class="tc-metric">
            <i class="pi pi-users"></i>
            <span>{{ league().total_participants }}</span>
            <span class="tc-metric__label">participantes</span>
          </div>
          @if (league().buy_in_amount > 0) {
            <div class="tc-metric tc-metric--prize">
              <i class="pi pi-trophy"></i>
              <span class="tc-metric__label">Premio por clasificar</span>
            </div>
          }
        </div>

        @if (league().is_joined) {
          <div class="tc-user-stats">
            <span class="tc-user-pos">{{ positionEmoji() }}</span>
            <div class="tc-user-info">
              <span class="tc-user-pts">
                {{ league().accumulated_points }}<span class="tc-pts-label"> pts</span>
              </span>
              <span class="tc-user-rank">de {{ league().total_participants }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="tc-footer">
        @if (league().is_joined) {
          <button class="tc-btn tc-btn--primary" type="button" (click)="navigate.emit()">
            <i class="pi pi-arrow-right"></i>
            Ver liga
          </button>
        } @else if (league().approval_status === 'pending_approval') {
          <div class="tc-pending">
            <i class="pi pi-clock"></i>
            <span>Pendiente de aprobación</span>
          </div>
        } @else if (canJoin()) {
          <button
            class="tc-btn tc-btn--join"
            type="button"
            [disabled]="joining()"
            (click)="join.emit()"
          >
            @if (joining()) {
              <i class="pi pi-spin pi-spinner"></i>
              Procesando...
            } @else {
              <i class="pi pi-plus-circle"></i>
              {{ joinLabel() }}
            }
          </button>
        } @else {
          <span class="tc-unavailable">No disponible</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .tc-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition:
          transform 0.22s ease,
          box-shadow 0.22s ease,
          border-color 0.22s ease;
        animation: tcFadeUp 0.35s ease both;
      }

      @keyframes tcFadeUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .tc-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
        border-color: var(--primary);
      }

      .tc-card--joined {
        border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      }

      /* Banner */
      .tc-banner {
        position: relative;
        height: 140px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .tc-banner__img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }

      .tc-banner__initial {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 5rem;
        font-weight: 900;
        color: rgba(255, 255, 255, 0.13);
        user-select: none;
      }

      .tc-banner__overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.72) 100%);
      }

      .tc-banner__bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1;
        padding: 0.625rem 0.875rem;
      }

      .tc-banner__title {
        color: #fff;
        font-size: 1rem;
        font-weight: 800;
        margin: 0 0 0.375rem;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tc-chips {
        display: flex;
        gap: 0.3rem;
        flex-wrap: wrap;
      }

      .tc-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.15rem 0.5rem;
        border-radius: 99px;
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }

      .tc-chip--active {
        background: rgba(34, 197, 94, 0.22);
        color: rgb(74, 222, 128);
        border: 1px solid rgba(34, 197, 94, 0.4);
      }

      .tc-chip--draft {
        background: rgba(251, 191, 36, 0.18);
        color: rgb(251, 191, 36);
        border: 1px solid rgba(251, 191, 36, 0.35);
      }

      .tc-chip--inactive {
        background: rgba(156, 163, 175, 0.2);
        color: rgb(209, 213, 219);
        border: 1px solid rgba(156, 163, 175, 0.3);
      }

      .tc-chip--finished {
        background: rgba(239, 68, 68, 0.18);
        color: rgb(248, 113, 113);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .tc-chip--type {
        background: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .tc-chip--prize {
        background: rgba(251, 191, 36, 0.18);
        color: rgb(251, 191, 36);
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      /* Body */
      .tc-body {
        padding: 0.875rem 1rem 0.625rem;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        flex: 1;
      }

      .tc-desc {
        font-size: 0.75rem;
        color: var(--muted-foreground);
        margin: 0;
        line-height: 1.4;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .tc-metrics {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        flex-wrap: wrap;
      }

      .tc-metric {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--foreground);
      }

      .tc-metric i {
        font-size: 0.75rem;
        color: var(--muted-foreground);
      }
      .tc-metric__label {
        font-size: 0.7rem;
        font-weight: 400;
        color: var(--muted-foreground);
      }
      .tc-metric--prize {
        color: #d4a017;
      }
      .tc-metric--prize i {
        color: #d4a017;
      }

      /* User stats */
      .tc-user-stats {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 0.75rem;
        background: color-mix(in srgb, var(--primary) 10%, transparent);
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
      }

      .tc-user-pos {
        font-size: 1.2rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .tc-user-info {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex: 1;
      }

      .tc-user-pts {
        font-size: 0.9rem;
        font-weight: 900;
        color: var(--primary);
      }
      .tc-pts-label {
        font-size: 0.7rem;
        font-weight: 400;
        color: var(--muted-foreground);
      }
      .tc-user-rank {
        font-size: 0.7rem;
        color: var(--muted-foreground);
        margin-left: auto;
      }

      /* Footer */
      .tc-footer {
        padding: 0 1rem 1rem;
      }

      .tc-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .tc-btn i {
        font-size: 0.875rem;
      }

      .tc-btn--primary {
        background: var(--primary);
        color: var(--primary-foreground);
        border: none;
      }

      .tc-btn--primary:hover {
        opacity: 0.88;
        transform: translateY(-1px);
      }

      .tc-btn--join {
        background: transparent;
        border: 1.5px solid var(--primary);
        color: var(--primary);
      }

      .tc-btn--join:hover:not(:disabled) {
        background: color-mix(in srgb, var(--primary) 10%, transparent);
        transform: translateY(-1px);
      }

      .tc-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .tc-unavailable {
        display: block;
        text-align: center;
        color: var(--muted-foreground);
        font-size: 0.75rem;
        padding: 0.5rem 0;
      }

      .tc-pending {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 0.6rem 1rem;
        border-radius: 8px;
        background: rgba(251, 191, 36, 0.1);
        border: 1.5px dashed rgba(251, 191, 36, 0.45);
        color: rgb(251, 191, 36);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .tc-pending i {
        font-size: 0.8rem;
      }
    `,
  ],
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
