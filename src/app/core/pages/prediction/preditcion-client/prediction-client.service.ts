import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../services/supabase-service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationService } from '../../../../shared/services/notification-service';
import { LeagueCreationService } from '../../league/league-creation.service';

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
  leagueId: number;
  buyInAmount: number;
  leagueName: string;
}

const MATCH_SELECT = `
  match_id, league_id, start_time, end_time,
  first_team_id, second_team_id,
  first_team_total, second_team_total,
  grupo_id, round, is_deleted,
  homeTeam:TEAM!MATCH_first_team_id_fkey(name, logo_url),
  awayTeam:TEAM!MATCH_second_team_id_fkey(name, logo_url)
`;

const TRX_CUOTA = 98; // Cuota de Entrada — debit predictor
const TRX_AJUSTE = 100; // Ajuste Manual — refund on rollback

@Injectable({ providedIn: 'root' })
export class PredictionClientService {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);
  private readonly walletSvc = inject(WalletService);
  private readonly notif = inject(NotificationService);
  private readonly leagueRules = inject(LeagueCreationService);

  async loadContext(matchId: number): Promise<PredictionContext | null> {
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) return null;

    const { data: userRow, error: userErr } = await this.db.client
      .from('USER')
      .select('user_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (userErr || !userRow) return null;

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
    if (!userLeagueId) return null;

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

    await Promise.all(
      cards
        .filter((card) => {
          const minutesUntilEnd = (new Date(card.endTime).getTime() - now.getTime()) / 60000;
          return minutesUntilEnd <= 16 && minutesUntilEnd > 0;
        })
        .map((card) => this.leagueRules.isPredictionLocked(card.matchId)),
    );

    return { league, userLeagueId, cards, focusedMatchId: matchId };
  }

  async upsertPrediction(data: PredictionUpsert): Promise<boolean> {
    const { data: existing } = await this.db.client
      .from('PREDICTION')
      .select('prediction_id, wager_amount')
      .eq('match_id', data.matchId)
      .eq('user_league_id', data.userLeagueId)
      .eq('is_deleted', false)
      .maybeSingle();

    const isNew = !existing;
    const currentWager = Number((existing as any)?.wager_amount ?? 0);
    const nextWager = data.buyInAmount > 0 ? Math.max(0, Number(data.wagerAmount) || 0) : 0;
    const wagerDelta = isNew ? nextWager : nextWager - currentWager;

    if (data.buyInAmount > 0 && isNew && nextWager <= 0) {
      this.notif.notify(
        'warn',
        'Apuesta requerida',
        'Debes ingresar un monto mayor a 0 para esta liga.',
      );
      return false;
    }

    if (data.buyInAmount > 0 && wagerDelta !== 0) {
      const paid = await this.processWagerDelta(data, wagerDelta);
      if (!paid) return false;
    }

    if (existing) {
      const { error } = await this.db.client
        .from('PREDICTION')
        .update({
          first_team_score: data.firstTeamScore,
          second_team_score: data.secondTeamScore,
          wager_amount: nextWager,
          updated_at: new Date().toISOString(),
        })
        .eq('prediction_id', (existing as any).prediction_id);

      if (error && data.buyInAmount > 0 && wagerDelta !== 0) {
        await this.rollbackWagerDelta(data, wagerDelta);
      }
      return !error;
    } else {
      const { error } = await this.db.client.from('PREDICTION').insert({
        match_id: data.matchId,
        user_league_id: data.userLeagueId,
        first_team_score: data.firstTeamScore,
        second_team_score: data.secondTeamScore,
        wager_amount: nextWager,
      });

      if (error && data.buyInAmount > 0 && wagerDelta !== 0) {
        await this.rollbackWagerDelta(data, wagerDelta);
      }
      return !error;
    }
  }

  private async processWagerDelta(data: PredictionUpsert, delta: number): Promise<boolean> {
    if (delta === 0) return true;

    if (delta > 0) {
      const charged = await this.chargeUser(data, delta);
      if (!charged) return false;

      const pooled = await this.adjustLeagueCashbox(data.leagueId, delta);
      if (!pooled) {
        await this.refundUser(data, delta);
        return false;
      }

      return true;
    }

    const refundAmount = Math.abs(delta);
    const pooled = await this.adjustLeagueCashbox(data.leagueId, delta);
    if (!pooled) return false;

    const refunded = await this.refundUser(data, refundAmount);
    if (!refunded) {
      await this.adjustLeagueCashbox(data.leagueId, refundAmount);
      return false;
    }

    return true;
  }

  private async chargeUser(data: PredictionUpsert, amount: number): Promise<boolean> {
    const userId = Number(this.auth.getInternalUserId());
    const userWalletRes = await this.walletSvc.getWallet(userId);

    if (userWalletRes.error || !userWalletRes.data) {
      this.notif.notify('error', 'Error', 'No se encontró tu wallet.');
      return false;
    }

    const userWallet = userWalletRes.data;

    if (userWallet.balance < amount) {
      this.notif.notify('warn', 'Saldo insuficiente', `Necesitas $${amount} para esta predicción.`);
      return false;
    }

    const debitResult = await this.walletSvc.withdraw(
      userWallet.wallet_id,
      userId,
      amount,
      TRX_CUOTA,
      `Cuota de Entrada: ${data.leagueName}`,
    );
    if (debitResult.error) {
      this.notif.notify('error', 'Error', 'No se pudo cobrar la cuota.');
      return false;
    }

    return true;
  }

  private async refundUser(data: PredictionUpsert, amount: number): Promise<boolean> {
    const userId = Number(this.auth.getInternalUserId());
    const userWalletRes = await this.walletSvc.getWallet(userId);
    if (!userWalletRes.error && userWalletRes.data) {
      const result = await this.walletSvc.deposit(
        userWalletRes.data.wallet_id,
        userId,
        amount,
        TRX_AJUSTE,
        `Reembolso cuota: ${data.leagueName}`,
      );
      return !result.error;
    }

    return false;
  }

  private async rollbackWagerDelta(data: PredictionUpsert, delta: number): Promise<void> {
    if (delta === 0) return;

    if (delta > 0) {
      await this.adjustLeagueCashbox(data.leagueId, -delta);
      await this.refundUser(data, delta);
      return;
    }

    const amount = Math.abs(delta);
    await this.adjustLeagueCashbox(data.leagueId, amount);
    await this.chargeUser(data, amount);
  }

  private async adjustLeagueCashbox(leagueId: number, delta: number): Promise<boolean> {
    const now = new Date().toISOString();

    const { data: rewardRow, error: rewardErr } = await this.db.client
      .from('LEAGUE_REWARD')
      .select('league_reward_id, total_collected_amount')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (rewardErr) {
      this.notif.notify('error', 'Error', 'No se pudo actualizar la caja de la liga.');
      return false;
    }

    const currentAmount = Number((rewardRow as any)?.total_collected_amount ?? 0);
    const nextAmount = currentAmount + delta;

    if (nextAmount < 0) {
      this.notif.notify('error', 'Error', 'La caja de la liga no puede quedar en negativo.');
      return false;
    }

    if (!rewardRow) {
      if (delta <= 0) {
        this.notif.notify('error', 'Error', 'No existe caja de liga para descontar el monto.');
        return false;
      }

      const { error } = await this.db.client.from('LEAGUE_REWARD').insert({
        league_id: leagueId,
        mundial_id: 1,
        total_collected_amount: nextAmount,
        platform_fee_5pct: 0,
        global_prize_1pct: 0,
        created_at: now,
        created_by: Number(this.auth.getInternalUserId()),
        is_deleted: false,
      } as any);

      if (error) {
        this.notif.notify('error', 'Error', 'No se pudo crear la caja de la liga.');
        return false;
      }

      return true;
    }

    const { error } = await this.db.client
      .from('LEAGUE_REWARD')
      .update({
        total_collected_amount: nextAmount,
        updated_at: now,
        updated_by: Number(this.auth.getInternalUserId()),
      })
      .eq('league_reward_id', (rewardRow as any).league_reward_id);

    if (error) {
      this.notif.notify('error', 'Error', 'No se pudo actualizar la caja de la liga.');
      return false;
    }

    return true;
  }
}
