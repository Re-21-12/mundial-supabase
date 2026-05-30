import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SupabaseService } from '../../services/supabase-service';
import { NotificationService } from '../../../shared/services/notification-service';

// FIFA 2026 bracket: 12 groups (A-L) → 32 qualifiers → 16 round-of-32 matches
// Pairing formula for bracket_position 1..16
const BRACKET_PAIRS: Array<{ home: string; away: string }> = [
  { home: 'A1', away: 'B2' }, // pos 1
  { home: 'C1', away: 'D2' }, // pos 2
  { home: 'E1', away: 'F2' }, // pos 3
  { home: 'G1', away: 'H2' }, // pos 4
  { home: 'I1', away: 'J2' }, // pos 5
  { home: 'K1', away: 'L2' }, // pos 6
  { home: 'A3', away: 'B3' }, // pos 7  (best 3rd-place of groups A & B)
  { home: 'C3', away: 'D3' }, // pos 8
  { home: 'B1', away: 'A2' }, // pos 9
  { home: 'D1', away: 'C2' }, // pos 10
  { home: 'F1', away: 'E2' }, // pos 11
  { home: 'H1', away: 'G2' }, // pos 12
  { home: 'J1', away: 'I2' }, // pos 13
  { home: 'L1', away: 'K2' }, // pos 14
  { home: 'E3', away: 'F3' }, // pos 15
  { home: 'G3', away: 'H3' }, // pos 16
];

interface League {
  league_id: number;
  name: string;
}

interface Team {
  team_id: number;
  name: string;
}

interface KnockoutMatch {
  match_id: number;
  round: number;
  bracket_position: number;
  first_team_id: number | null;
  second_team_id: number | null;
  start_time: string;
}

interface MatchEdit {
  homeTeamId: number | null;
  awayTeamId: number | null;
  saving: boolean;
  dirty: boolean;
}

interface GroupStandingRow {
  grupo_id: number;
  team_id: number;
  points: number;
  goal_diff: number;
  goals_for: number;
}

interface GrupoRow {
  grupo_id: number;
  name: string;
}

@Component({
  selector: 'app-admin-bracket',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule, TooltipModule],
  templateUrl: './admin-bracket.html',
  styleUrl: './admin-bracket.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBracketPage implements OnInit {
  private readonly db = inject(SupabaseService);
  private readonly notif = inject(NotificationService);

  readonly leagues = signal<League[]>([]);
  readonly selectedLeagueId = signal<number | null>(null);
  readonly teams = signal<Team[]>([]);
  readonly matches = signal<KnockoutMatch[]>([]);
  readonly edits = signal<Map<number, MatchEdit>>(new Map());

  readonly loading = signal(false);
  readonly calculating = signal(false);
  readonly saving = signal(false);

  readonly round1Matches = computed(() => this.matches().filter((m) => m.round === 1));

  readonly hasDirtyEdits = computed(() => [...this.edits().values()].some((e) => e.dirty));

  readonly laterRoundSections = computed(() => {
    const labels: Record<number, string> = {
      2: 'Octavos de Final',
      3: 'Cuartos de Final',
      4: 'Semifinales',
      5: 'Final / 3er Lugar',
    };
    return [2, 3, 4, 5]
      .map((round) => ({
        round,
        label: labels[round] ?? `Ronda ${round}`,
        matches: this.matches().filter((m) => m.round === round),
      }))
      .filter((s) => s.matches.length > 0);
  });

  async ngOnInit(): Promise<void> {
    const [leagueRes, teamRes] = await Promise.all([
      this.db.client.from('LEAGUE').select('league_id, name').eq('is_deleted', false).order('name'),
      this.db.client.from('TEAM').select('team_id, name').eq('is_deleted', false).order('name'),
    ]);
    if (leagueRes.data) this.leagues.set(leagueRes.data as League[]);
    if (teamRes.data) this.teams.set(teamRes.data as Team[]);
  }

  async onLeagueChange(leagueId: number | null): Promise<void> {
    this.selectedLeagueId.set(leagueId);
    this.edits.set(new Map());
    if (!leagueId) {
      this.matches.set([]);
      return;
    }

    this.loading.set(true);
    const { data } = await this.db.client
      .from('MATCH')
      .select('match_id, round, bracket_position, first_team_id, second_team_id, start_time')
      .eq('league_id', leagueId)
      .is('grupo_id', null)
      .not('round', 'is', null)
      .eq('is_deleted', false)
      .order('round')
      .order('bracket_position');

    if (data) {
      const ms = data as KnockoutMatch[];
      this.matches.set(ms);
      const editMap = new Map<number, MatchEdit>();
      ms.filter((m) => m.round === 1).forEach((m) =>
        editMap.set(m.match_id, {
          homeTeamId: m.first_team_id,
          awayTeamId: m.second_team_id,
          saving: false,
          dirty: false,
        }),
      );
      this.edits.set(editMap);
    }
    this.loading.set(false);
  }

  getEdit(matchId: number): MatchEdit | undefined {
    return this.edits().get(matchId);
  }

  setHome(matchId: number, teamId: number | null): void {
    this.edits.update((m) => {
      const n = new Map(m);
      const e = n.get(matchId);
      if (e) n.set(matchId, { ...e, homeTeamId: teamId, dirty: true });
      return n;
    });
  }

  setAway(matchId: number, teamId: number | null): void {
    this.edits.update((m) => {
      const n = new Map(m);
      const e = n.get(matchId);
      if (e) n.set(matchId, { ...e, awayTeamId: teamId, dirty: true });
      return n;
    });
  }

  async saveMatch(matchId: number): Promise<void> {
    const edit = this.edits().get(matchId);
    if (!edit) return;

    this.edits.update((m) => {
      const n = new Map(m);
      n.set(matchId, { ...edit, saving: true });
      return n;
    });

    const { error } = await this.db.client
      .from('MATCH')
      .update({
        first_team_id: edit.homeTeamId,
        second_team_id: edit.awayTeamId,
        updated_at: new Date().toISOString(),
      })
      .eq('match_id', matchId);

    if (error) {
      this.notif.notify('error', 'Error', 'No se pudo guardar.');
    } else {
      this.matches.update((list) =>
        list.map((m) =>
          m.match_id === matchId
            ? { ...m, first_team_id: edit.homeTeamId, second_team_id: edit.awayTeamId }
            : m,
        ),
      );
    }

    this.edits.update((m) => {
      const n = new Map(m);
      n.set(matchId, { ...edit, saving: false, dirty: false });
      return n;
    });
  }

  async saveAll(): Promise<void> {
    const dirty = [...this.edits().entries()].filter(([, e]) => e.dirty);
    if (!dirty.length) return;
    this.saving.set(true);
    await Promise.all(dirty.map(([id]) => this.saveMatch(id)));
    this.saving.set(false);
    this.notif.notify('success', 'Guardado', `${dirty.length} partido(s) actualizados.`);
  }

  // Reads GRUPO_STANDING for world_league_id=4 (FIFA World Cup 2026),
  // picks top 2 + best 8 third-place teams, and maps them to BRACKET_PAIRS.
  async calcularBracket(): Promise<void> {
    this.calculating.set(true);
    try {
      const [gruposRes, standingsRes] = await Promise.all([
        this.db.client
          .from('GRUPO')
          .select('grupo_id, name')
          .eq('world_league_id', 4)
          .eq('is_deleted', false)
          .order('name'),
        this.db.client
          .from('GRUPO_STANDING')
          .select('grupo_id, team_id, points, goal_diff, goals_for')
          .eq('is_deleted', false),
      ]);

      if (gruposRes.error || standingsRes.error) {
        this.notif.notify('error', 'Error', 'No se pudo cargar la información de grupos.');
        return;
      }

      const grupos = (gruposRes.data ?? []) as GrupoRow[];
      const standings = (standingsRes.data ?? []) as GroupStandingRow[];

      // Build a map: group_name → teams sorted by points, goal_diff, goals_for
      const groupMap = new Map<string, number[]>();
      for (const grupo of grupos) {
        const grouped = standings
          .filter((s) => s.grupo_id === grupo.grupo_id)
          .sort(
            (a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for,
          )
          .map((s) => s.team_id);
        groupMap.set(grupo.name, grouped);
      }

      // Resolve slot key (e.g. "A1") → team_id
      const resolve = (slot: string): number | null => {
        const group = slot.slice(0, -1); // "A1" → "A"
        const pos = parseInt(slot.slice(-1)) - 1; // "1" → index 0
        const teams = groupMap.get(group) ?? [];
        return teams[pos] ?? null;
      };

      // Apply to edits map
      const r1 = this.round1Matches();
      this.edits.update((prev) => {
        const next = new Map(prev);
        for (const match of r1) {
          const idx = match.bracket_position - 1;
          const pair = BRACKET_PAIRS[idx];
          if (!pair) continue;
          next.set(match.match_id, {
            homeTeamId: resolve(pair.home),
            awayTeamId: resolve(pair.away),
            saving: false,
            dirty: true,
          });
        }
        return next;
      });

      this.notif.notify(
        'success',
        'Bracket calculado',
        'Revisa los equipos y guarda para confirmar.',
      );
    } finally {
      this.calculating.set(false);
    }
  }

  getTeamName(teamId: number | null): string {
    if (!teamId) return '—';
    return this.teams().find((t) => t.team_id === teamId)?.name ?? `#${teamId}`;
  }

  leagueOptions() {
    return this.leagues().map((l) => ({ label: l.name, value: l.league_id }));
  }

  teamOptions() {
    return [
      { label: '— Sin asignar —', value: null },
      ...this.teams().map((t) => ({ label: t.name, value: t.team_id })),
    ];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
