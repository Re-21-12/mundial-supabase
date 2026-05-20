import { ChangeDetectionStrategy, Component, computed, effect, inject, input, resource } from '@angular/core';
import { BracketService, type BracketMatchRaw } from '../../../core/services/bracket.service';
import { WorldCupGroupsComponent } from '../world-cup-groups/world-cup-groups';
import type { GrupoCard } from '../../../core/pages/home/models/home.models';

export interface BracketMatch {
  matchId: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away' | null;
  isLive: boolean;
  bracketPosition: number | null;
  matchLabel?: string;
  homeTbd: boolean;
  awayTbd: boolean;
}

export interface BracketRound {
  label: string;
  pairs: BracketMatch[][];
  slotH: number;
}

// WC2026 bracket: 5 rounds.
// round 1 = Dieciseisavos (16 matches), 2 = Octavos (8), 3 = Cuartos (4),
// 4 = Semifinal (2), 5 = Final (bracket_position=1) + Tercer Lugar (bracket_position=2)
const ROUND_LABELS: Record<number, string> = {
  1: 'Dieciseisavos de Final',
  2: 'Octavos de Final',
  3: 'Cuartos de Final',
  4: 'Semifinal',
  5: 'Final',
};

const FINAL_MATCH_LABELS: Record<number, string> = {
  1: 'Final',
  2: 'Tercer Lugar',
};

const BASE_SLOT_H = 92;

@Component({
  selector: 'app-tournament-bracket',
  standalone: true,
  imports: [WorldCupGroupsComponent],
  templateUrl: './tournament-bracket.html',
  styleUrl: './tournament-bracket.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentBracketComponent {
  readonly leagueId = input.required<number>();
  readonly grupos = input<GrupoCard[]>([]);

  private readonly bracketService = inject(BracketService);

  protected readonly bracketData = resource({
    params: () => this.leagueId(),
    loader: ({ params: leagueId }) => this.bracketService.getKnockoutBracket(leagueId),
  });

  constructor() {
    // Real-time: re-fetch bracket whenever any match in this league changes.
    // Effect auto-cleans up the previous channel subscription when leagueId changes.
    effect((onCleanup) => {
      const leagueId = this.leagueId();
      const unsub = this.bracketService.subscribe(leagueId, () => {
        this.bracketData.reload();
      });
      onCleanup(unsub);
    });
  }

  readonly rounds = computed<BracketRound[]>(() => {
    const raw = this.bracketData.value() ?? [];
    if (!raw.length) return [];
    return this.buildRounds(raw);
  });

  protected readonly isLoading = computed(() => this.bracketData.isLoading());
  protected readonly hasError = computed(() => !!this.bracketData.error());

  // ── Build ────────────────────────────────────────────────────────────────────

  private buildRounds(raw: BracketMatchRaw[]): BracketRound[] {
    const byRound = new Map<number, BracketMatchRaw[]>();
    for (const m of raw) {
      const r = m.round ?? 999;
      if (!byRound.has(r)) byRound.set(r, []);
      byRound.get(r)!.push(m);
    }

    const roundNums = [...byRound.keys()].sort((a, b) => a - b);
    const total = roundNums.length;

    // Cap slotH at the SF level (index = total - 2) so the Final/3rd column
    // stays vertically compact and aligns with the SF column height.
    const sfIndex = total - 2;
    const maxSlotH = BASE_SLOT_H * Math.pow(2, sfIndex);

    return roundNums.map((roundNum, i) => {
      const isLast = i === total - 1;
      const roundMatches = byRound.get(roundNum)!.sort(
        (a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0),
      );

      const matches = roundMatches.map((m) => this.toMatch(m, roundNum));
      const pairs = this.toPairs(matches);
      const slotH = isLast ? maxSlotH : BASE_SLOT_H * Math.pow(2, i);

      return {
        label: ROUND_LABELS[roundNum] ?? `Ronda ${roundNum}`,
        pairs,
        slotH,
      };
    });
  }

  private toMatch(raw: BracketMatchRaw, roundNum: number): BracketMatch {
    const homeTbd = raw.first_team_id === null;
    const awayTbd = raw.second_team_id === null;

    let winner: 'home' | 'away' | null = null;
    if (raw.winner_team_id) {
      winner = raw.winner_team_id === raw.first_team_id ? 'home' : 'away';
    }

    const matchLabel = roundNum === 5
      ? FINAL_MATCH_LABELS[raw.bracket_position ?? 0]
      : undefined;

    return {
      matchId: raw.match_id,
      homeName: (raw.homeTeam as any)?.name ?? '',
      awayName: (raw.awayTeam as any)?.name ?? '',
      homeScore: raw.first_team_total ?? 0,
      awayScore: raw.second_team_total ?? 0,
      winner,
      isLive: false,
      bracketPosition: raw.bracket_position,
      matchLabel,
      homeTbd,
      awayTbd,
    };
  }

  private toPairs(matches: BracketMatch[]): BracketMatch[][] {
    const pairs: BracketMatch[][] = [];
    for (let i = 0; i < matches.length; i += 2) {
      pairs.push(matches.slice(i, i + 2));
    }
    return pairs;
  }
}
