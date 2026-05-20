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
  league_type: string;
  league_type_desc: string;
}

export interface UserStanding {
  position: number;
  user_id: number;
  user_name: string;
  accumulated_points: number;
}

export interface TeamStanding {
  position: number;
  team_id: number;
  team_name: string;
  points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
}

export interface GrupoTeamRow {
  team_id: number;
  team_name: string;
  position: number | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  advances: boolean | null;
}

export interface GrupoGroup {
  grupo_id: number;
  name: string;
  teams: GrupoTeamRow[];
}

export interface LeagueDetail {
  users: UserStanding[];
  teams: TeamStanding[];
  grupos: GrupoGroup[];
}

@Injectable({ providedIn: 'root' })
export class UserLeaguesService {
  private readonly _db = inject(SupabaseService);

  async loadUserLeagues(userId: number): Promise<UserLeagueCard[]> {
    const [leagueRes, catalogRes] = await Promise.all([
      this._db.client
        .from('USER_LEAGUE')
        .select('user_league_id, league_id, accumulated_points, LEAGUE(name, status, is_deleted, catalog_id)')
        .eq('user_id', userId)
        .eq('is_deleted', false),
      this._db.client
        .from('CATALOG')
        .select('catalog_id, value, description')
        .eq('is_deleted', false),
    ]);

    if (leagueRes.error || !leagueRes.data) {
      console.error('[UserLeagues]', leagueRes.error);
      return [];
    }

    const catalogMap = new Map<number, { value: string; description: string }>(
      ((catalogRes.data ?? []) as any[]).map((c) => [
        c.catalog_id,
        { value: c.value ?? 'Sin tipo', description: c.description ?? '' },
      ]),
    );

    const activeEntries = (leagueRes.data as any[]).filter(
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
        const cat = catalogMap.get(ul.LEAGUE?.catalog_id);

        return {
          user_league_id: ul.user_league_id,
          league_id: ul.league_id,
          league_name: ul.LEAGUE?.name ?? 'Liga',
          accumulated_points: ul.accumulated_points ?? 0,
          position: idx >= 0 ? idx + 1 : sorted.length + 1,
          total_participants: sorted.length,
          status: ul.LEAGUE?.status ?? 'active',
          league_type: cat?.value ?? 'Sin tipo',
          league_type_desc: cat?.description ?? '',
        } satisfies UserLeagueCard;
      }),
    );

    return cards.sort((a, b) => a.position - b.position);
  }

  async loadLeagueDetail(leagueId: number): Promise<LeagueDetail> {
    const [usersRes, teamsRes, leagueRes] = await Promise.all([
      this._db.client
        .from('USER_LEAGUE')
        .select('user_id, accumulated_points, USER(name)')
        .eq('league_id', leagueId)
        .eq('is_deleted', false)
        .order('accumulated_points', { ascending: false })
        .limit(8),
      this._db.client
        .from('TEAM_LEAGUE')
        .select('team_id, points, games_played, wins, draws, losses, goals_for, goals_against, TEAM(name)')
        .eq('league_id', leagueId)
        .eq('is_deleted', false)
        .order('points', { ascending: false })
        .limit(8),
      this._db.client
        .from('LEAGUE')
        .select('world_league_id')
        .eq('league_id', leagueId)
        .single(),
    ]);

    const users: UserStanding[] = ((usersRes.data ?? []) as any[]).map((row, i) => ({
      position: i + 1,
      user_id: row.user_id,
      user_name: row.USER?.name ?? `Usuario ${row.user_id}`,
      accumulated_points: row.accumulated_points ?? 0,
    }));

    const teams: TeamStanding[] = ((teamsRes.data ?? []) as any[]).map((row, i) => ({
      position: i + 1,
      team_id: row.team_id,
      team_name: row.TEAM?.name ?? `Equipo ${row.team_id}`,
      points: row.points ?? 0,
      games_played: row.games_played ?? 0,
      wins: row.wins ?? 0,
      draws: row.draws ?? 0,
      losses: row.losses ?? 0,
      goals_for: row.goals_for ?? 0,
      goals_against: row.goals_against ?? 0,
      goal_diff: (row.goals_for ?? 0) - (row.goals_against ?? 0),
    }));

    let grupos: GrupoGroup[] = [];
    const worldLeagueId = leagueRes.data?.world_league_id;
    if (worldLeagueId) {
      const { data: gruposRaw } = await this._db.client
        .from('GRUPO')
        .select(
          'grupo_id, name, GRUPO_STANDING(team_id, position, games_played, wins, draws, losses, goals_for, goals_against, goal_diff, points, advances, is_deleted, TEAM(name))',
        )
        .eq('world_league_id', worldLeagueId)
        .eq('is_deleted', false)
        .order('name');

      grupos = ((gruposRaw ?? []) as any[]).map((g) => ({
        grupo_id: g.grupo_id,
        name: g.name,
        teams: ((g.GRUPO_STANDING ?? []) as any[])
          .filter((s: any) => !s.is_deleted)
          .sort((a: any, b: any) => {
            if (a.position !== null && b.position !== null) return a.position - b.position;
            if (b.points !== a.points) return b.points - a.points;
            return b.goal_diff - a.goal_diff;
          })
          .map((s: any) => ({
            team_id: s.team_id,
            team_name: s.TEAM?.name ?? `Equipo ${s.team_id}`,
            position: s.position,
            games_played: s.games_played ?? 0,
            wins: s.wins ?? 0,
            draws: s.draws ?? 0,
            losses: s.losses ?? 0,
            goals_for: s.goals_for ?? 0,
            goals_against: s.goals_against ?? 0,
            goal_diff: s.goal_diff ?? 0,
            points: s.points ?? 0,
            advances: s.advances,
          })),
      }));
    }

    return { users, teams, grupos };
  }
}
