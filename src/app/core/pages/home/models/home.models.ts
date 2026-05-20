import type { Database } from '../../../../types/database.types';

export type MatchRow = Database['public']['Tables']['MATCH']['Row'];
export type TeamRow = Database['public']['Tables']['TEAM']['Row'];
export type MatchPeriodRow = Database['public']['Tables']['MATCH_PERIOD']['Row'];
export type PredictionRow = Database['public']['Tables']['PREDICTION']['Row'];
export type UserLeagueRow = Database['public']['Tables']['USER_LEAGUE']['Row'];
export type LeagueRewardRow = Database['public']['Tables']['LEAGUE_REWARD']['Row'];

/** Vista compuesta para el carousel y las cards de partidos */
export interface MatchCard {
  match: MatchRow;
  homeTeam: TeamRow;
  awayTeam: TeamRow;
  /** Marcador en vivo — actualizado via MATCH_PERIOD realtime */
  period?: MatchPeriodRow;
  /** Predicción del usuario actual para este partido */
  prediction?: Pick<PredictionRow, 'first_team_score' | 'second_team_score'>;
  isLive: boolean;
}

export interface HomeStat {
  icon: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  colorClass: string;
}

export interface GrupoTeam {
  grupo_standing_id: number;
  team_id: number;
  team_name: string;
  position: number | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goal_diff: number;
  points: number;
  advances: boolean | null;
}

export interface GrupoCard {
  grupo_id: number;
  name: string;
  teams: GrupoTeam[];
}
