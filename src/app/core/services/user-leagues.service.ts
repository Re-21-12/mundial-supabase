import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export interface UserLeagueCard {
  user_league_id: number;
  league_id: number;
  league_name: string;
  accumulated_points: number;
  position: number;
  total_participants: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class UserLeaguesService {
  private readonly _db = inject(SupabaseService);

  async loadUserLeagues(userId: number): Promise<UserLeagueCard[]> {
    const { data, error } = await this._db.client
      .from('USER_LEAGUE')
      .select('user_league_id, league_id, accumulated_points, LEAGUE(name, status, is_deleted)')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error || !data) {
      console.error('[UserLeagues]', error);
      return [];
    }

    const activeEntries = (data as any[]).filter(
      (ul) => ul.LEAGUE?.status === 'active' && !ul.LEAGUE?.is_deleted,
    );

    const cards = await Promise.all(
      activeEntries.map(async (ul) => {
        const { data: members } = await this._db.client
          .from('USER_LEAGUE')
          .select('user_id, accumulated_points')
          .eq('league_id', ul.league_id)
          .eq('is_deleted', false)
          .order('accumulated_points', { ascending: false });

        const sorted = members ?? [];
        const idx = sorted.findIndex((m: any) => m.user_id === userId);

        return {
          user_league_id: ul.user_league_id,
          league_id: ul.league_id,
          league_name: ul.LEAGUE?.name ?? 'Liga',
          accumulated_points: ul.accumulated_points ?? 0,
          position: idx >= 0 ? idx + 1 : sorted.length + 1,
          total_participants: sorted.length,
          status: ul.LEAGUE?.status ?? 'active',
        } satisfies UserLeagueCard;
      }),
    );

    return cards.sort((a, b) => a.position - b.position);
  }
}
