import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import {
  MatchTicketCardComponent,
  type MatchTicketData,
} from '../../../../shared/components/match-ticket-card/match-ticket-card';
import { ClientContentService, ClientMatchRow } from '../../../services/client-content.service';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'finished';
type HourSlot = 'all' | 'morning' | 'afternoon' | 'night';
type RoundFilter = 'all' | number;

const ROUND_LABELS: Record<number, string> = {
  0: 'Fase de Grupos',
  1: 'Dieciseisavos',
  2: 'Octavos de Final',
  3: 'Cuartos de Final',
  4: 'Semifinales',
  5: 'Final / 3er Lugar',
};

function roundLabel(round: number | null | undefined, grupoId: number | null | undefined): string {
  if (round === null || round === undefined) return 'Sin ronda';
  if (round === 0 && grupoId != null) return 'Fase de Grupos';
  return ROUND_LABELS[round] ?? `Ronda ${round}`;
}

function matchStatus(row: ClientMatchRow): 'upcoming' | 'live' | 'finished' {
  const normalize = (ts?: string | null) => {
    if (!ts) return null;
    if (ts.endsWith('Z') || /[\+\-]\d{2}:?\d{2}$/.test(ts)) return ts;
    return ts.includes('T') ? `${ts}Z` : ts.replace(' ', 'T') + 'Z';
  };

  const now = Date.now();
  const start = row.start_time ? new Date(normalize(row.start_time) as string).getTime() : null;
  const end = row.end_time ? new Date(normalize(row.end_time) as string).getTime() : null;

  if (start && end && now >= start && now <= end) return 'live';
  return 'upcoming';
}

function hourSlot(startTime: string | null): HourSlot {
  if (!startTime) return 'all';
  const h = new Date(startTime).getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'night';
}

@Component({
  selector: 'app-mis-partidos',
  standalone: true,
  imports: [MatchTicketCardComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-partidos.html',
  styleUrls: ['./mis-partidos.css'],
})
export class MisPartidosPage implements OnInit {
  private readonly router = inject(Router);
  private readonly clientContent = inject(ClientContentService);
  private readonly auth = inject(AuthFacade);

  protected readonly cards = signal<MatchTicketData[]>([]);
  protected readonly loading = signal(true);
  protected readonly now = signal(new Date());
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  // ── Filtros ────────────────────────────────────────────────────────────────
  protected readonly activeFilter = signal<StatusFilter>('all');
  protected readonly filterHour = signal<HourSlot>('all');
  protected readonly filterLeague = signal<string>('');
  protected readonly filterStadium = signal<string>('');
  protected readonly filterRound = signal<RoundFilter>('all');
  protected readonly showExtraFilters = signal(false);

  protected readonly canUserPredict = computed(() =>
    this.auth.permissions().includes('prediction:create'),
  );

  protected readonly statusFilters: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Próximos', value: 'upcoming' },
    { label: 'En vivo', value: 'live' },
    { label: 'Finalizados', value: 'finished' },
  ];

  protected readonly hourSlots: { label: string; value: HourSlot; icon: string }[] = [
    { label: 'Cualquier hora', value: 'all', icon: 'pi-clock' },
    { label: 'Mañana (00–12)', value: 'morning', icon: 'pi-sun' },
    { label: 'Tarde (12–18)', value: 'afternoon', icon: 'pi-cloud' },
    { label: 'Noche (18–24)', value: 'night', icon: 'pi-moon' },
  ];

  protected readonly availableLeagues = computed(() =>
    [
      ...new Set(
        this.cards()
          .map((c) => c.leagueName)
          .filter(Boolean) as string[],
      ),
    ].sort(),
  );

  protected readonly availableStadiums = computed(() =>
    [
      ...new Set(
        this.cards()
          .map((c) => c.stadiumName)
          .filter(Boolean) as string[],
      ),
    ].sort(),
  );

  protected readonly availableRounds = computed(() =>
    [
      ...new Set(
        this.cards()
          .map((c) => c.round)
          .filter((r): r is number => r != null),
      ),
    ]
      .sort((a, b) => a - b)
      .map((r) => ({ value: r, label: ROUND_LABELS[r] ?? `Ronda ${r}` })),
  );

  protected readonly hasActiveExtraFilters = computed(
    () =>
      this.filterHour() !== 'all' ||
      this.filterLeague() !== '' ||
      this.filterStadium() !== '' ||
      this.filterRound() !== 'all',
  );

  protected readonly filtered = computed(() => {
    const status = this.activeFilter();
    const hour = this.filterHour();
    const league = this.filterLeague();
    const stadium = this.filterStadium();
    const round = this.filterRound();

    return this.visibleCards().filter((card) => {
      if (status !== 'all' && card.status !== status) return false;
      if (hour !== 'all' && hourSlot(card.startTime) !== hour) return false;
      if (league && card.leagueName !== league) return false;
      if (stadium && card.stadiumName !== stadium) return false;
      if (round !== 'all' && card.round !== round) return false;
      return true;
    });
  });

  protected readonly visibleCards = computed(() =>
    this.cards().map((card) => ({
      ...card,
      status: this.resolveCardStatus(card),
    })),
  );

  async ngOnInit(): Promise<void> {
    this.tickInterval = setInterval(() => this.now.set(new Date()), 30000);
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);

    try {
      const rows = await this.clientContent.loadMatches();

      this.cards.set(
        rows.map((row) => {
          const status = matchStatus(row);

          const normalize = (ts?: string | null) => {
            if (!ts) return null;
            if (ts.endsWith('Z') || /[\+\-]\d{2}:?\d{2}$/.test(ts)) return ts;
            return ts.includes('T') ? `${ts}Z` : ts.replace(' ', 'T') + 'Z';
          };

          const startIso = normalize(row.start_time) ?? row.start_time;
          const startTimeMs = startIso ? new Date(startIso).getTime() : null;
          const nowMs = Date.now();
          const minutesUntilStart = startTimeMs ? (startTimeMs - nowMs) / 60000 : Infinity;

          return {
            matchId: row.match_id,
            homeTeam: row.home_team
              ? {
                  id: row.home_team.team_id,
                  name: row.home_team.name,
                  logoUrl: row.home_team.logo_url,
                }
              : { id: 0, name: 'Por definir', logoUrl: null },
            awayTeam: row.away_team
              ? {
                  id: row.away_team.team_id,
                  name: row.away_team.name,
                  logoUrl: row.away_team.logo_url,
                }
              : { id: 0, name: 'Por definir', logoUrl: null },
            startTime: startIso,
            endTime: normalize(row.end_time) ?? row.end_time,
            homeScore: row.first_team_total,
            awayScore: row.second_team_total,
            stadiumName: row.stadium?.name ?? null,
            leagueName: row.league?.name ?? null,
            round: row.round,
            grupoId: row.grupo_id,
            status,
            canPredict: status === 'upcoming' && this.canUserPredict() && minutesUntilStart > 15,
          };
        }),
      );
    } catch (error) {
      console.error('[MisPartidos] load error:', error);
      this.cards.set([]);
    }

    this.loading.set(false);
  }

  protected clearExtraFilters(): void {
    this.filterHour.set('all');
    this.filterLeague.set('');
    this.filterStadium.set('');
    this.filterRound.set('all');
  }

  protected onPredict(card: MatchTicketData): void {
    void this.router.navigate(['/prediction-client', card.matchId]);
  }

  private resolveCardStatus(card: MatchTicketData): 'upcoming' | 'live' | 'finished' {
    if (card.status === 'finished') {
      return 'finished';
    }

    const nowMs = this.now().getTime();
    const startMs = card.startTime ? new Date(card.startTime).getTime() : null;
    const endMs = card.endTime ? new Date(card.endTime).getTime() : null;

    if (endMs !== null && nowMs >= endMs) {
      return 'finished';
    }

    if (startMs !== null && endMs !== null && nowMs >= startMs && nowMs < endMs) {
      return 'live';
    }

    if (startMs !== null && nowMs < startMs) {
      return 'upcoming';
    }

    return 'finished';
  }

  ngOnDestroy(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
    }
  }
}
