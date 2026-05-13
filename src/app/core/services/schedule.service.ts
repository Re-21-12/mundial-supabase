import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export type ScheduledMatch = {
  match_id: number;
  start_time: string;
  status: MatchStatus;
  first_team_id: number;
  first_team_name: string;
  first_team_total: number;
  second_team_id: number;
  second_team_name: string;
  second_team_total: number;
};

function resolveStatus(startTime: string, firstTotal: number, secondTotal: number): MatchStatus {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 'upcoming';
  if (firstTotal === 0 && secondTotal === 0 && diffMs < 130 * 60 * 1000) return 'live';
  if (diffMs < 130 * 60 * 1000) return 'live';
  return 'finished';
}

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly _db = inject(SupabaseService);

  async loadSchedule(leagueId: number): Promise<ScheduledMatch[]> {
    const { data, error } = await this._db.client
      .from('MATCH')
      .select(`
        match_id, start_time, first_team_total, second_team_total,
        first_team_id, second_team_id,
        FIRST_TEAM:TEAM!MATCH_first_team_id_fkey(name),
        SECOND_TEAM:TEAM!MATCH_second_team_id_fkey(name)
      `)
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[Schedule]', error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      match_id: row.match_id,
      start_time: row.start_time,
      status: resolveStatus(row.start_time, row.first_team_total, row.second_team_total),
      first_team_id: row.first_team_id,
      first_team_name: row.FIRST_TEAM?.name ?? '—',
      first_team_total: row.first_team_total,
      second_team_id: row.second_team_id,
      second_team_name: row.SECOND_TEAM?.name ?? '—',
      second_team_total: row.second_team_total,
    }));
  }
}
