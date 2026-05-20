import { inject, Injectable } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase-service';

export interface BracketMatchRaw {
  match_id: number;
  round: number;
  bracket_position: number | null;
  first_team_id: number | null;
  second_team_id: number | null;
  first_team_total: number;
  second_team_total: number;
  winner_team_id: number | null;
  start_time: string;
  homeTeam: { team_id: number; name: string } | null;
  awayTeam: { team_id: number; name: string } | null;
}

// WC2026 bracket: 32 knockout matches per league
// round 1=R32 (16), 2=R16 (8), 3=QF (4), 4=SF (2), 5=Final(pos=1)+Tercer(pos=2)
const WC26_STRUCTURE: { round: number; count: number }[] = [
  { round: 1, count: 16 },
  { round: 2, count: 8 },
  { round: 3, count: 4 },
  { round: 4, count: 2 },
  { round: 5, count: 2 }, // Final (pos=1) + Tercer Lugar (pos=2)
];

const QUERY_SELECT = `
  match_id, round, bracket_position,
  first_team_id, second_team_id,
  first_team_total, second_team_total,
  winner_team_id, start_time,
  homeTeam:TEAM!MATCH_first_team_id_fkey(team_id, name),
  awayTeam:TEAM!MATCH_second_team_id_fkey(team_id, name)
`;

@Injectable({ providedIn: 'root' })
export class BracketService {
  private readonly db = inject(SupabaseService);

  async getKnockoutBracket(leagueId: number): Promise<BracketMatchRaw[]> {
    const matches = await this._fetchKnockout(leagueId);

    // Auto-initialize bracket shell if it doesn't exist yet
    if (matches.length === 0) {
      const created = await this._initializeBracket(leagueId);
      return created ? this._fetchKnockout(leagueId) : [];
    }

    return matches;
  }

  /** Subscribe to any MATCH change in this league — calls onUpdate on any event. */
  subscribe(leagueId: number, onUpdate: () => void): () => void {
    const channel: RealtimeChannel = this.db.client
      .channel(`bracket-league-${leagueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'MATCH', filter: `league_id=eq.${leagueId}` },
        onUpdate,
      )
      .subscribe();

    return () => {
      this.db.client.removeChannel(channel);
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private async _fetchKnockout(leagueId: number): Promise<BracketMatchRaw[]> {
    const { data, error } = await this.db.client
      .from('MATCH')
      .select(QUERY_SELECT)
      .eq('league_id', leagueId)
      .not('round', 'is', null)
      .eq('is_deleted', false)
      .order('round', { ascending: true })
      .order('bracket_position', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('[BracketService] fetch error:', error);
      return [];
    }
    return (data ?? []) as unknown as BracketMatchRaw[];
  }

  private async _initializeBracket(leagueId: number): Promise<boolean> {
    // Fetch any available stadium to use as placeholder
    const { data: stadiums } = await this.db.client
      .from('STADIUM')
      .select('stadium_id')
      .eq('is_deleted', false)
      .limit(1)
      .single();

    if (!stadiums) {
      console.error('[BracketService] No stadiums found — bracket cannot be initialized.');
      return false;
    }

    const stadiumId = (stadiums as any).stadium_id as number;
    // Placeholder dates — will be updated when matches are scheduled
    const placeholderStart = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
    const placeholderEnd = new Date(Date.now() + 60 * 24 * 3600 * 1000 + 7200 * 1000).toISOString();

    const rows = WC26_STRUCTURE.flatMap(({ round, count }) =>
      Array.from({ length: count }, (_, idx) => ({
        league_id: leagueId,
        round,
        bracket_position: idx + 1,
        first_team_total: 0,
        second_team_total: 0,
        stadium_id: stadiumId,
        start_time: placeholderStart,
        end_time: placeholderEnd,
        is_deleted: false,
      })),
    );

    const { error } = await this.db.client.from('MATCH').insert(rows as any);
    if (error) {
      console.error('[BracketService] initializeBracket error:', error);
      return false;
    }

    console.log(`[BracketService] Initialized 32-match bracket for league ${leagueId}`);
    return true;
  }
}
