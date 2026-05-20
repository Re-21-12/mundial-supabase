import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../services/supabase-service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';

export interface PredictionLeagueInfo {
  league_id: number;
  name: string;
  buy_in_amount: number;
}

export interface PredictionMatchCard {
  matchId: number;
  leagueId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  startTime: string;
  endTime: string;
  homeScore: number;
  awayScore: number;
  grupoId: number | null;
  round: number | null;
  isLive: boolean;
  isFinished: boolean;
  canPredict: boolean;
  prediction: PredictionData | null;
}

export interface PredictionData {
  predictionId: number | null;
  firstTeamScore: number;
  secondTeamScore: number;
  wagerAmount: number;
}

export interface PredictionContext {
  league: PredictionLeagueInfo;
  userLeagueId: number | null;
  cards: PredictionMatchCard[];
  focusedMatchId: number;
}

export interface PredictionUpsert {
  matchId: number;
  userLeagueId: number;
  firstTeamScore: number;
  secondTeamScore: number;
  wagerAmount: number;
}

const MATCH_SELECT = `
  match_id, league_id, start_time, end_time,
  first_team_id, second_team_id,
  first_team_total, second_team_total,
  grupo_id, round, is_deleted,
  homeTeam:TEAM!MATCH_first_team_id_fkey(name, logo_url),
  awayTeam:TEAM!MATCH_second_team_id_fkey(name, logo_url)
`;

@Injectable({ providedIn: 'root' })
export class PredictionClientService {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);

  async loadContext(matchId: number): Promise<PredictionContext | null> {
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) return null;

    // Load match to get league_id
    const { data: matchRow, error: matchErr } = await this.db.client
      .from('MATCH')
      .select(MATCH_SELECT)
      .eq('match_id', matchId)
      .eq('is_deleted', false)
      .single();

    if (matchErr || !matchRow) return null;

    const leagueId: number = (matchRow as any).league_id;

    // Load league info (including buy_in_amount) and user_league in parallel
    const [leagueRes, userLeagueRes, matchesRes] = await Promise.all([
      this.db.client
        .from('LEAGUE')
        .select('league_id, name, buy_in_amount')
        .eq('league_id', leagueId)
        .single(),
      this.db.client
        .from('USER_LEAGUE')
        .select('user_league_id')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .maybeSingle(),
      this.db.client
        .from('MATCH')
        .select(MATCH_SELECT)
        .eq('league_id', leagueId)
        .eq('is_deleted', false)
        .order('start_time', { ascending: true })
        .limit(200),
    ]);

    if (leagueRes.error || !leagueRes.data) return null;

    const leagueData = leagueRes.data as any;
    const league: PredictionLeagueInfo = {
      league_id: leagueData.league_id,
      name: leagueData.name,
      buy_in_amount: leagueData.buy_in_amount ?? 0,
    };

    const userLeagueId: number | null = (userLeagueRes.data as any)?.user_league_id ?? null;

    // Load predictions for this user_league (if member)
    let predictions: any[] = [];
    if (userLeagueId) {
      const { data: predsData } = await this.db.client
        .from('PREDICTION')
        .select('prediction_id, match_id, first_team_score, second_team_score, wager_amount')
        .eq('user_league_id', userLeagueId)
        .eq('is_deleted', false);
      predictions = predsData ?? [];
    }

    const predMap = new Map<number, any>(predictions.map((p: any) => [p.match_id, p]));
    const now = new Date();

    const cards: PredictionMatchCard[] = ((matchesRes.data ?? []) as any[]).map((m) => {
      const start = new Date(m.start_time);
      const end = new Date(m.end_time);
      const isLive = start <= now && end >= now;
      const isFinished = end < now;
      const minutesToEnd = (end.getTime() - now.getTime()) / 60000;
      const canPredict = minutesToEnd > 15;
      const pred = predMap.get(m.match_id);

      return {
        matchId: m.match_id,
        leagueId: m.league_id,
        homeTeamName: (m.homeTeam as any)?.name ?? 'Local',
        awayTeamName: (m.awayTeam as any)?.name ?? 'Visitante',
        homeTeamLogo: (m.homeTeam as any)?.logo_url ?? null,
        awayTeamLogo: (m.awayTeam as any)?.logo_url ?? null,
        startTime: m.start_time,
        endTime: m.end_time,
        homeScore: m.first_team_total ?? 0,
        awayScore: m.second_team_total ?? 0,
        grupoId: m.grupo_id,
        round: m.round,
        isLive,
        isFinished,
        canPredict,
        prediction: pred
          ? {
              predictionId: pred.prediction_id,
              firstTeamScore: pred.first_team_score ?? 0,
              secondTeamScore: pred.second_team_score ?? 0,
              wagerAmount: pred.wager_amount ?? 0,
            }
          : null,
      };
    });

    return { league, userLeagueId, cards, focusedMatchId: matchId };
  }

  async upsertPrediction(data: PredictionUpsert): Promise<boolean> {
    const { data: existing } = await this.db.client
      .from('PREDICTION')
      .select('prediction_id')
      .eq('match_id', data.matchId)
      .eq('user_league_id', data.userLeagueId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) {
      const { error } = await this.db.client
        .from('PREDICTION')
        .update({
          first_team_score: data.firstTeamScore,
          second_team_score: data.secondTeamScore,
          wager_amount: data.wagerAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('prediction_id', (existing as any).prediction_id);
      return !error;
    } else {
      const { error } = await this.db.client
        .from('PREDICTION')
        .insert({
          match_id: data.matchId,
          user_league_id: data.userLeagueId,
          first_team_score: data.firstTeamScore,
          second_team_score: data.secondTeamScore,
          wager_amount: data.wagerAmount,
        });
      return !error;
    }
  }
}
