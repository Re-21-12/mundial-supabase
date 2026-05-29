import { Injectable, inject } from '@angular/core';
import { AuthFacade } from '../../shared/features/auth/auth.facade';
import { SupabaseService } from './supabase-service';
import { UserLeaguesService } from '../pages/user-league/user-leagues.service';

const CLIENT_ROLE_NAMES = new Set(['client', 'cliente']);

export interface ClientLeagueRow {
  league_id: number;
  name: string;
  status: string | null;
  logo_url: string | null;
  invitation_code: string | null;
  buy_in_amount: number;
  created_by: number | null;
  catalog: { description: string } | null;
  user_league: { accumulated_points: number }[] | null;
}

export interface ClientTeamRow {
  team_id: number;
  name: string;
  logo_url: string | null;
  created_by: number | null;
}

export interface ClientStadiumRow {
  stadium_id: number;
  name: string | null;
  logo_url: string | null;
  created_by: number | null;
}

export interface ClientMatchRow {
  match_id: number;
  start_time: string | null;
  end_time: string | null;
  first_team_total: number;
  second_team_total: number;
  scored_at: string | null;
  is_deleted: boolean;
  league_id: number;
  stadium_id: number | null;
  home_team: { team_id: number; name: string; logo_url: string | null } | null;
  away_team: { team_id: number; name: string; logo_url: string | null } | null;
  stadium: { name: string | null } | null;
  league: { name: string | null; created_by: number | null } | null;
}

export interface ClientLeagueGroupView {
  league_id: number;
  league_name: string;
  league_status: string | null;
  league_logo_url: string | null;
  grupos: {
    grupo_id: number;
    grupo_name: string;
    teams: {
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
    }[];
  }[];
}

export interface ClientGroupCard {
  grupo_id: number;
  grupo_name: string;
  teams: {
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
  }[];
}

@Injectable({ providedIn: 'root' })
export class ClientContentService {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);
  private readonly userLeagues = inject(UserLeaguesService);

  isClientUser(): boolean {
    const role = this.auth.role();
    return role != null && CLIENT_ROLE_NAMES.has(role.toLowerCase());
  }

  getCurrentUserId(): number | null {
    const userId = Number(this.auth.getInternalUserId());
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  async loadLeagues(): Promise<ClientLeagueRow[]> {
    const query = (this.db.client as any)
      .from('LEAGUE')
      .select(
        `
        league_id, name, status, logo_url, invitation_code, buy_in_amount, created_by,
        catalog:CATALOG(description),
        user_league:USER_LEAGUE!USER_LEAGUE_league_id_fkey(accumulated_points)
      `,
      )
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    const userId = this.getCurrentUserId();
    if (this.isClientUser() && userId) {
      const [membershipRes, createdRes] = await Promise.all([
        this.db.client
          .from('USER_LEAGUE')
          .select('league_id')
          .eq('user_id', userId)
          .eq('is_deleted', false),
        this.db.client
          .from('LEAGUE')
          .select('league_id')
          .eq('created_by', userId)
          .eq('is_deleted', false),
      ]);

      if (membershipRes.error) {
        throw membershipRes.error;
      }
      if (createdRes.error) {
        throw createdRes.error;
      }

      const leagueIds = [
        ...new Set(
          [
            ...(membershipRes.data ?? []).map((row: any) => row.league_id),
            ...(createdRes.data ?? []).map((row: any) => row.league_id),
          ].filter(Boolean),
        ),
      ];

      if (leagueIds.length === 0) {
        return [];
      }

      const { data, error } = await query.in('league_id', leagueIds);
      if (error) {
        throw error;
      }

      return (data ?? []) as ClientLeagueRow[];
    }

    const scopedQuery = query;
    const { data, error } = await scopedQuery;

    if (error) {
      throw error;
    }

    return (data ?? []) as ClientLeagueRow[];
  }

  async loadTeams(): Promise<ClientTeamRow[]> {
    const query = (this.db.client as any)
      .from('TEAM')
      .select('team_id, name, logo_url, created_by')
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    const userId = this.getCurrentUserId();
    const scopedQuery = this.isClientUser() && userId ? query.eq('created_by', userId) : query;
    const { data, error } = await scopedQuery;

    if (error) {
      throw error;
    }

    return (data ?? []) as ClientTeamRow[];
  }

  async loadStadiums(): Promise<ClientStadiumRow[]> {
    const query = (this.db.client as any)
      .from('STADIUM')
      .select('stadium_id, name, logo_url, created_by')
      .eq('is_deleted', false)
      .order('name', { ascending: true });

    const userId = this.getCurrentUserId();
    const scopedQuery = this.isClientUser() && userId ? query.eq('created_by', userId) : query;
    const { data, error } = await scopedQuery;

    if (error) {
      throw error;
    }

    return (data ?? []) as ClientStadiumRow[];
  }

  async loadMatches(): Promise<ClientMatchRow[]> {
    const queryBuilder = (this.db.client as any)
      .from('MATCH')
      .select(
        `
        match_id, start_time, end_time,
        first_team_total, second_team_total,
        scored_at, is_deleted, league_id, stadium_id,
        home_team:TEAM!MATCH_first_team_id_fkey(team_id, name, logo_url),
        away_team:TEAM!MATCH_second_team_id_fkey(team_id, name, logo_url),
        stadium:STADIUM(name),
        league:LEAGUE(name, created_by)
      `,
      )
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });

    if (!this.isClientUser()) {
      const { data, error } = await queryBuilder;
      if (error) {
        throw error;
      }
      return (data ?? []) as ClientMatchRow[];
    }

    const leagueIds = await this.loadOwnedLeagueIds();
    if (leagueIds.length === 0) {
      return [];
    }

    const { data, error } = await queryBuilder.in('league_id', leagueIds);
    if (error) {
      throw error;
    }

    return (data ?? []) as ClientMatchRow[];
  }

  async loadGroups(): Promise<ClientLeagueGroupView[]> {
    const leagues = await this.loadLeagues();
    if (leagues.length === 0) {
      return [];
    }

    const details = await Promise.all(
      leagues.map(async (league) => {
        const detail = await this.userLeagues.loadLeagueDetail(league.league_id);
        return { league, detail };
      }),
    );

    return details.map(({ league, detail }) => ({
      league_id: league.league_id,
      league_name: league.name,
      league_status: league.status,
      league_logo_url: league.logo_url,
      grupos: detail.grupos.map((grupo) => ({
        grupo_id: grupo.grupo_id,
        grupo_name: grupo.name,
        teams: grupo.teams,
      })),
    }));
  }

  async loadOwnedLeagueIds(): Promise<number[]> {
    const leagues = await this.loadLeagues();
    return leagues.map((league) => league.league_id);
  }
}
