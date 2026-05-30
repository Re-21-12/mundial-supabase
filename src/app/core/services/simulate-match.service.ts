import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';
import { AuthFacade } from '../../shared/features/auth/auth.facade';
import { LeagueScoringService } from '../pages/league/league-scoring.service';

export interface SimulateResult {
  success: boolean;
  summary?: string;
  error?: string;
}

const BRACKET_PAIRS: Array<{ home: string; away: string }> = [
  { home: 'A1', away: 'B2' },
  { home: 'C1', away: 'D2' },
  { home: 'E1', away: 'F2' },
  { home: 'G1', away: 'H2' },
  { home: 'I1', away: 'J2' },
  { home: 'K1', away: 'L2' },
  { home: 'A3', away: 'B3' },
  { home: 'C3', away: 'D3' },
  { home: 'B1', away: 'A2' },
  { home: 'D1', away: 'C2' },
  { home: 'F1', away: 'E2' },
  { home: 'H1', away: 'G2' },
  { home: 'J1', away: 'I2' },
  { home: 'L1', away: 'K2' },
  { home: 'E3', away: 'F3' },
  { home: 'G3', away: 'H3' },
];

@Injectable({ providedIn: 'root' })
export class SimulateMatchService {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);
  private readonly scoring = inject(LeagueScoringService);

  /**
   * Picks the next unscored match in the league, assigns a random result,
   * evaluates predictions and accumulates points.
   * The DB trigger trg_advance_bracket_winner fires automatically on scored_at.
   */
  async simulateNextMatch(leagueId: number): Promise<SimulateResult> {
    const { data: matches } = await this.db.client
      .from('MATCH')
      .select('match_id, first_team_id, second_team_id')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .is('scored_at', null)
      .order('start_time')
      .limit(1);

    if (!matches?.length) {
      return { success: false, error: 'No hay partidos pendientes en esta liga.' };
    }

    const match = (matches[0] as any);
    const homeScore = Math.floor(Math.random() * 5);
    const awayScore = Math.floor(Math.random() * 5);
    const now = new Date().toISOString();
    const operatorId = Number(this.auth.getInternalUserId());

    // Set scores only — scored_at is intentionally omitted here so that
    // evaluatePredictionsForMatch can run its idempotency-safe evaluation
    // and set scored_at itself (which then fires trg_advance_bracket_winner).
    const { error } = await this.db.client
      .from('MATCH')
      .update({
        first_team_total: homeScore,
        second_team_total: awayScore,
        phase: 'finished',
        updated_at: now,
        updated_by: operatorId,
      } as any)
      .eq('match_id', match.match_id);

    if (error) return { success: false, error: error.message };

    await this.scoring.evaluatePredictionsForMatch(match.match_id);

    return {
      success: true,
      summary: `Partido #${match.match_id} simulado: ${homeScore} – ${awayScore}`,
    };
  }

  /**
   * Reads GRUPO_STANDING (world_league_id=4) to compute which teams advance
   * from groups, then assigns them to the round-1 bracket matches of the league.
   * Equivalent to "Calcular desde Grupos" in the admin bracket page.
   */
  async advanceBracket(leagueId: number): Promise<SimulateResult> {
    const [gruposRes, standingsRes, r1Res] = await Promise.all([
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
      this.db.client
        .from('MATCH')
        .select('match_id, bracket_position')
        .eq('league_id', leagueId)
        .is('grupo_id', null)
        .not('round', 'is', null)
        .eq('round', 1)
        .eq('is_deleted', false)
        .order('bracket_position'),
    ]);

    if (gruposRes.error || standingsRes.error || r1Res.error) {
      return { success: false, error: 'No se pudo cargar la información de grupos.' };
    }

    const grupos = (gruposRes.data ?? []) as Array<{ grupo_id: number; name: string }>;
    const standings = (standingsRes.data ?? []) as Array<{
      grupo_id: number;
      team_id: number;
      points: number;
      goal_diff: number;
      goals_for: number;
    }>;
    const r1Matches = (r1Res.data ?? []) as Array<{ match_id: number; bracket_position: number }>;

    if (!r1Matches.length) {
      return { success: false, error: 'La liga no tiene partidos de ronda 1 configurados.' };
    }

    const groupMap = new Map<string, number[]>();
    for (const grupo of grupos) {
      const sorted = standings
        .filter((s) => s.grupo_id === grupo.grupo_id)
        .sort(
          (a, b) =>
            b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for,
        )
        .map((s) => s.team_id);
      groupMap.set(grupo.name, sorted);
    }

    const resolve = (slot: string): number | null => {
      const group = slot.slice(0, -1);
      const pos = parseInt(slot.slice(-1)) - 1;
      return groupMap.get(group)?.[pos] ?? null;
    };

    const now = new Date().toISOString();
    const operatorId = Number(this.auth.getInternalUserId());
    let updated = 0;

    for (const m of r1Matches) {
      const idx = m.bracket_position - 1;
      const pair = BRACKET_PAIRS[idx];
      if (!pair) continue;

      const homeId = resolve(pair.home);
      const awayId = resolve(pair.away);

      await this.db.client
        .from('MATCH')
        .update({
          first_team_id: homeId,
          second_team_id: awayId,
          updated_at: now,
          updated_by: operatorId,
        } as any)
        .eq('match_id', m.match_id);

      updated++;
    }

    return {
      success: true,
      summary: `${updated} partido(s) de ronda 1 actualizados con equipos clasificados.`,
    };
  }
}
