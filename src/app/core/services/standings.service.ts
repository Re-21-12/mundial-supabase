import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type StandingRow = {
  user_league_id: number;
  user_id: number;
  accumulated_points: number;
  user_name: string;
  user_login: string;
  rank: number;
  previous_rank: number | null;
  /** Positive = moved up, negative = moved down, 0 = same, null = no prior data */
  rankChange: number | null;
};

@Injectable({ providedIn: 'root' })
export class StandingsService {
  private readonly _db = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

  async loadStandings(leagueId: number): Promise<StandingRow[]> {
    const { data, error } = await this._db.client
      .from('USER_LEAGUE')
      .select('user_league_id, user_id, accumulated_points, previous_rank, USER(name, login)')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .order('accumulated_points', { ascending: false });

    if (error) {
      console.error('[Standings]', error);
      return [];
    }

    return (data ?? []).map((row: any, index: number) => {
      const currentRank = index + 1;
      const previousRank: number | null = row.previous_rank ?? null;
      const rankChange = previousRank !== null ? previousRank - currentRank : null;

      return {
        user_league_id: row.user_league_id,
        user_id: row.user_id,
        accumulated_points: row.accumulated_points,
        user_name: row.USER?.name ?? '—',
        user_login: row.USER?.login ?? '—',
        rank: currentRank,
        previous_rank: previousRank,
        rankChange,
      };
    });
  }

  /**
   * Snapshots current standings as previous_rank before a score update.
   * Call this before recalculating accumulated_points.
   */
  async snapshotRanks(leagueId: number): Promise<void> {
    const standings = await this.loadStandings(leagueId);
    for (const row of standings) {
      await this._db.client
        .from('USER_LEAGUE')
        .update({ previous_rank: row.rank } as any)
        .eq('user_league_id', row.user_league_id);
    }
  }

  subscribeToChanges(leagueId: number, onUpdate: () => void): void {
    this.unsubscribe();
    this.channel = this._db.client
      .channel(`standings-${leagueId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'USER_LEAGUE', filter: `league_id=eq.${leagueId}` },
        onUpdate,
      )
      .subscribe();
  }

  unsubscribe(): void {
    if (this.channel) {
      this._db.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
