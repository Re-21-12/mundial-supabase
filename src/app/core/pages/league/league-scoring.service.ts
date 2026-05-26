import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../../../shared/services/notification-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { GlobalPrizeService } from './global-prize.service';

// catalog_id 97 = TRX_PREMIO / Premio Liga en la tabla CATALOG
const TRX_PREMIO_LIGA = 97;

interface StandingEntry {
  userLeagueId: number;
  userId: number;
  points: number;
}

interface PrizeAllocation {
  userLeagueId: number;
  userId: number;
  amount: number;
  rank: string;
}

@Injectable({ providedIn: 'root' })
export class LeagueScoringService {
  private readonly db = inject(SupabaseService);
  private readonly walletSvc = inject(WalletService);
  private readonly notif = inject(NotificationService);
  private readonly auth = inject(AuthFacade);
  private readonly globalPrizeSvc = inject(GlobalPrizeService);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Evaluar predicciones al registrar el resultado de un partido
  //    1 punto → resultado correcto (ganador o empate acertado)
  //    3 puntos → marcador exacto
  //    Idempotente: no vuelve a evaluar si scored_at ya está seteado
  // ─────────────────────────────────────────────────────────────────────────────
  async evaluatePredictionsForMatch(matchId: number): Promise<boolean> {
    const { data: match, error: matchErr } = await this.db.client
      .from('MATCH')
      .select('match_id, league_id, first_team_total, second_team_total, scored_at, is_deleted')
      .eq('match_id', matchId)
      .single();

    if (matchErr || !match) return false;

    const m = match as any;

    // Ya evaluado → no re-procesar
    if (m.scored_at) return true;

    const actualHome = Number(m.first_team_total ?? 0);
    const actualAway = Number(m.second_team_total ?? 0);
    const leagueId: number = m.league_id;

    // Obtener todas las predicciones del partido
    const { data: predictions, error: predErr } = await this.db.client
      .from('PREDICTION')
      .select('prediction_id, user_league_id, first_team_score, second_team_score')
      .eq('match_id', matchId)
      .eq('is_deleted', false);

    if (predErr) return false;

    const preds = (predictions ?? []) as any[];
    const now = new Date().toISOString();
    const operatorId = Number(this.auth.getInternalUserId());

    // Sumar puntos a cada USER_LEAGUE
    for (const pred of preds) {
      const pts = this.calcPoints(
        Number(pred.first_team_score ?? 0),
        Number(pred.second_team_score ?? 0),
        actualHome,
        actualAway,
      );

      if (pts === 0) continue;

      const { data: ul } = await this.db.client
        .from('USER_LEAGUE')
        .select('user_league_id, accumulated_points')
        .eq('user_league_id', Number(pred.user_league_id))
        .single();

      if (!ul) continue;

      const currentPts = Number((ul as any).accumulated_points ?? 0);
      await this.db.client
        .from('USER_LEAGUE')
        .update({
          accumulated_points: currentPts + pts,
          updated_at: now,
          updated_by: operatorId,
        })
        .eq('user_league_id', Number(pred.user_league_id));
    }

    // Marcar partido como evaluado
    await this.db.client
      .from('MATCH')
      .update({ scored_at: now, updated_at: now, updated_by: operatorId } as any)
      .eq('match_id', matchId);

    // Verificar si la liga debe cerrarse
    await this.checkAndCloseLeague(leagueId);

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Cerrar liga automáticamente cuando todos los partidos están evaluados
  // ─────────────────────────────────────────────────────────────────────────────
  async checkAndCloseLeague(leagueId: number): Promise<boolean> {
    const { data: league } = await this.db.client
      .from('LEAGUE')
      .select('league_id, status, world_league_id')
      .eq('league_id', leagueId)
      .single();

    if (!league || (league as any).status === 'finished') return false;

    const { data: matches, error } = await this.db.client
      .from('MATCH')
      .select('match_id, scored_at')
      .eq('league_id', leagueId)
      .eq('is_deleted', false);

    if (error || !matches || (matches as any[]).length === 0) return false;

    const allScored = (matches as any[]).every((m) => m.scored_at !== null);
    if (!allScored) return false;

    const now = new Date().toISOString();
    const operatorId = Number(this.auth.getInternalUserId());

    await this.db.client
      .from('LEAGUE')
      .update({ status: 'finished', updated_at: now, updated_by: operatorId })
      .eq('league_id', leagueId);

    // Distribuir premios de liga (aplica sólo si es liga de apuesta)
    await this.distributeLeagueRewards(leagueId);

    // Intentar distribuir premios globales si todas las ligas de apuesta del mundial ya cerraron
    const worldLeagueId = Number((league as any).world_league_id);
    if (worldLeagueId) {
      await this.globalPrizeSvc.distributeIfReady(worldLeagueId);
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Distribuir premios: 50/25/10/10 con reglas de empate
  //
  //    Reglas normales (≥4 participantes, sin empates):
  //      1er lugar  → 50% del total recaudado
  //      2do lugar  → 25%
  //      3er lugar  → 10%
  //      Último     → 10%
  //      Plataforma →  5% (de los cuales 1% son premios globales)
  //
  //    Reglas de empate (se aplican sobre el total recaudado × 0.95):
  //      Empate 1er → 85% / entre todos los empatados; último 10%
  //      Empate 2do → 1ro 50%; 35% / entre empatados 2do; último 10%
  //      Empate 3ro → 1ro 50%; 2do 25%; 10% / entre empatados 3ro; último 10%
  //      Empate últ → 1ro 50%; 2do 25%; 3ro 10%; 10% / entre empatados último
  // ─────────────────────────────────────────────────────────────────────────────
  async distributeLeagueRewards(leagueId: number): Promise<boolean> {
    // Solo procesar si ya existe caja (liga de apuesta con fondos)
    const { data: rewardRow, error: rewardErr } = await this.db.client
      .from('LEAGUE_REWARD')
      .select('league_reward_id, total_collected_amount')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (rewardErr || !rewardRow) return true; // liga de diversión, sin fondos
    const total = Number((rewardRow as any).total_collected_amount ?? 0);
    if (total <= 0) return true;

    const rewardId = (rewardRow as any).league_reward_id;

    // Verificar si ya se distribuyó (USER_LEAGUE_REWARD existente con status='paid')
    const { data: existingPayout } = await this.db.client
      .from('USER_LEAGUE_REWARD')
      .select('league_user_reward_id')
      .eq('league_reward_id', rewardId)
      .eq('status', 'paid')
      .limit(1)
      .maybeSingle();

    if (existingPayout) return true; // ya se distribuyó, idempotente

    // Obtener tabla de posiciones
    const { data: members, error: membersErr } = await this.db.client
      .from('USER_LEAGUE')
      .select('user_league_id, user_id, accumulated_points')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .order('accumulated_points', { ascending: false });

    if (membersErr || !members || (members as any[]).length === 0) return false;

    const standings: StandingEntry[] = (members as any[]).map((m) => ({
      userLeagueId: m.user_league_id,
      userId: m.user_id,
      points: Number(m.accumulated_points ?? 0),
    }));

    const allocations = this.buildAllocations(standings, total);
    const now = new Date().toISOString();
    const operatorId = Number(this.auth.getInternalUserId());

    // Pagar a cada ganador
    for (const alloc of allocations) {
      if (alloc.amount <= 0) continue;

      const walletRes = await this.walletSvc.getWallet(alloc.userId);
      if (walletRes.error || !walletRes.data) continue;

      await this.walletSvc.deposit(
        walletRes.data.wallet_id,
        alloc.userId,
        alloc.amount,
        TRX_PREMIO_LIGA,
        `Premio Liga — ${alloc.rank}`,
      );

      // Registrar el pago en USER_LEAGUE_REWARD
      await this.db.client.from('USER_LEAGUE_REWARD').upsert(
        {
          user_league_id: alloc.userLeagueId,
          league_reward_id: rewardId,
          amount: alloc.amount,
          status: 'paid',
          payment_date: now,
          updated_at: now,
          updated_by: operatorId,
        } as any,
        { onConflict: 'user_league_id' },
      );
    }

    // Actualizar LEAGUE_REWARD con los fees calculados
    await this.db.client
      .from('LEAGUE_REWARD')
      .update({
        platform_fee_5pct: round2(total * 0.05),
        global_prize_1pct: round2(total * 0.01),
        updated_at: now,
        updated_by: operatorId,
      })
      .eq('league_reward_id', rewardId);

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────────────────────────────────────────

  private calcPoints(
    predHome: number,
    predAway: number,
    actualHome: number,
    actualAway: number,
  ): number {
    // Marcador exacto → 3 puntos
    if (predHome === actualHome && predAway === actualAway) return 3;
    // Resultado correcto (ganador o empate) → 1 punto
    if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return 1;
    return 0;
  }

  private buildAllocations(standings: StandingEntry[], total: number): PrizeAllocation[] {
    const n = standings.length;
    if (n === 0) return [];

    // Liga con 1 participante: devuelve 95%
    if (n === 1) {
      return [{ ...standings[0], amount: round2(total * 0.95), rank: '1er lugar' }];
    }

    const allocs: PrizeAllocation[] = [];
    const byPoints = (pts: number) => standings.filter((s) => s.points === pts);
    const uniquePts = [...new Set(standings.map((s) => s.points))].sort((a, b) => b - a);

    const g1 = byPoints(uniquePts[0]); // 1er lugar
    const g2 = uniquePts.length > 1 ? byPoints(uniquePts[1]) : []; // 2do lugar
    const g3 = uniquePts.length > 2 ? byPoints(uniquePts[2]) : []; // 3er lugar
    const gLast = byPoints(uniquePts[uniquePts.length - 1]); // último

    // Caso: todos empatados
    if (uniquePts.length === 1) {
      const share = round2((total * 0.95) / n);
      return standings.map((s) => ({ ...s, amount: share, rank: '1er lugar (empate general)' }));
    }

    // ── EMPATE EN 1ER LUGAR ───────────────────────────────────────────────────
    if (g1.length > 1) {
      const firstShare = round2((total * 0.85) / g1.length);
      g1.forEach((s) => allocs.push({ ...s, amount: firstShare, rank: '1er lugar (empate)' }));

      // Último sólo si no está en el grupo 1
      const lastNotInFirst = gLast.filter(
        (l) => !g1.some((f) => f.userLeagueId === l.userLeagueId),
      );
      if (lastNotInFirst.length > 0) {
        const lastShare = round2((total * 0.1) / lastNotInFirst.length);
        lastNotInFirst.forEach((s) =>
          allocs.push({ ...s, amount: lastShare, rank: 'Último lugar' }),
        );
      }
      return allocs;
    }

    // 1er lugar único
    allocs.push({ ...g1[0], amount: round2(total * 0.5), rank: '1er lugar' });

    // Liga con sólo 2 participantes
    if (n === 2) {
      allocs.push({ ...gLast[0], amount: round2(total * 0.35), rank: 'Último lugar' });
      return allocs;
    }

    // ── EMPATE EN 2DO LUGAR ───────────────────────────────────────────────────
    if (g2.length > 1) {
      const secondShare = round2((total * 0.35) / g2.length);
      g2.forEach((s) => allocs.push({ ...s, amount: secondShare, rank: '2do lugar (empate)' }));

      const lastNotIn2nd = gLast.filter(
        (l) => !g2.some((s2) => s2.userLeagueId === l.userLeagueId),
      );
      if (lastNotIn2nd.length > 0) {
        const lastShare = round2((total * 0.1) / lastNotIn2nd.length);
        lastNotIn2nd.forEach((s) => allocs.push({ ...s, amount: lastShare, rank: 'Último lugar' }));
      }
      return allocs;
    }

    // 2do lugar único
    if (g2.length === 1) {
      allocs.push({ ...g2[0], amount: round2(total * 0.25), rank: '2do lugar' });
    }

    // Liga con sólo 3 participantes (3ro = último, combina 10%+10% = 20%)
    if (n === 3) {
      const thirdShare = round2((total * 0.2) / gLast.length);
      gLast.forEach((s) => allocs.push({ ...s, amount: thirdShare, rank: '3er/Último lugar' }));
      return allocs;
    }

    // ── EMPATE EN 3ER LUGAR ───────────────────────────────────────────────────
    if (g3.length > 1) {
      const thirdShare = round2((total * 0.1) / g3.length);
      g3.forEach((s) => allocs.push({ ...s, amount: thirdShare, rank: '3er lugar (empate)' }));

      const lastNotIn3rd = gLast.filter(
        (l) => !g3.some((s3) => s3.userLeagueId === l.userLeagueId),
      );
      if (lastNotIn3rd.length > 0) {
        const lastShare = round2((total * 0.1) / lastNotIn3rd.length);
        lastNotIn3rd.forEach((s) => allocs.push({ ...s, amount: lastShare, rank: 'Último lugar' }));
      }
      return allocs;
    }

    // 3er lugar único
    if (g3.length === 1) {
      allocs.push({ ...g3[0], amount: round2(total * 0.1), rank: '3er lugar' });
    }

    // ── EMPATE EN ÚLTIMO LUGAR (≥4 participantes) ─────────────────────────────
    const inTop3Ids = new Set([
      ...g1.map((s) => s.userLeagueId),
      ...g2.map((s) => s.userLeagueId),
      ...g3.map((s) => s.userLeagueId),
    ]);
    const lastNotInTop3 = gLast.filter((l) => !inTop3Ids.has(l.userLeagueId));

    if (lastNotInTop3.length > 0) {
      const lastShare = round2((total * 0.1) / lastNotInTop3.length);
      lastNotInTop3.forEach((s) =>
        allocs.push({
          ...s,
          amount: lastShare,
          rank: lastNotInTop3.length > 1 ? 'Último lugar (empate)' : 'Último lugar',
        }),
      );
    }

    return allocs;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
