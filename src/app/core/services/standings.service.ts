import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type StandingRow = {
  user_league_id: number;
  user_id: number;
  accumulated_points: number;
  user_name: string;
  user_login: string;
};

@Injectable({ providedIn: 'root' })
export class StandingsService {
  private readonly _db = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

  async loadStandings(leagueId: number): Promise<StandingRow[]> {
    const { data, error } = await this._db.client
      .from('USER_LEAGUE')
      .select('user_league_id, user_id, accumulated_points, USER(name, login)')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .order('accumulated_points', { ascending: false });

    if (error) {
      console.error('[Standings]', error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      user_league_id: row.user_league_id,
      user_id: row.user_id,
      accumulated_points: row.accumulated_points,
      user_name: row.USER?.name ?? '—',
      user_login: row.USER?.login ?? '—',
    }));
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
