import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { WalletService } from '../admin/wallet/wallet.service';

// TODO: Confirm catalog_id for Premio Global en la tabla CATALOG
const TRX_PREMIO_GLOBAL = 98;

interface GlobalMember {
  userId: number;
  leagueId: number;
  points: number;
}

@Injectable({ providedIn: 'root' })
export class GlobalPrizeService {
  private readonly db = inject(SupabaseService);
  private readonly walletSvc = inject(WalletService);
  private readonly auth = inject(AuthFacade);

  // ─────────────────────────────────────────────────────────────────────────────
  // Distributes the 1% global pool accumulated across all closed betting leagues
  // in a mundial.
  //
  //   50% → top-3 individuals globally (sum of points across all leagues)
  //             1st: 50% of that half  |  2nd: 25%  |  3rd: 10%  (15% stays platform)
  //   50% → all members of the league with the highest avg accumulated_points
  //             split equally among those members
  //
  // Idempotent: checks WORLD_LEAGUE.global_prizes_distributed_at.
  // Triggered only when ALL betting leagues are closed.
  // ─────────────────────────────────────────────────────────────────────────────
  async distributeIfReady(mundialId: number): Promise<boolean> {
    // Guard: already distributed?
    const { data: wl } = await this.db.client
      .from('WORLD_LEAGUE')
      .select('world_league_id, global_prizes_distributed_at')
      .eq('world_league_id', mundialId)
      .single();

    if (!wl || (wl as any).global_prizes_distributed_at) return true;

    // All betting leagues for this mundial must be closed
    const { data: leagues, error: leagueErr } = await this.db.client
      .from('LEAGUE')
      .select('league_id, status')
      .eq('world_league_id', mundialId)
      .eq('is_deleted', false)
      .gt('buy_in_amount', 0);

    if (leagueErr || !leagues || (leagues as any[]).length === 0) return false;

    const allClosed = (leagues as any[]).every((l) => l.status === 'finished');
    if (!allClosed) return false;

    const leagueIds = (leagues as any[]).map((l) => Number(l.league_id));

    // Sum global_prize_1pct across all closed betting leagues
    const { data: rewards } = await this.db.client
      .from('LEAGUE_REWARD')
      .select('global_prize_1pct')
      .in('league_id', leagueIds)
      .eq('is_deleted', false);

    const totalPool = ((rewards ?? []) as any[]).reduce(
      (sum, r) => sum + Number(r.global_prize_1pct ?? 0),
      0,
    );

    if (totalPool <= 0) return true; // no funds in any league

    // All members across all betting leagues with their accumulated points
    const { data: allMembers } = await this.db.client
      .from('USER_LEAGUE')
      .select('user_id, league_id, accumulated_points')
      .in('league_id', leagueIds)
      .eq('is_deleted', false);

    if (!allMembers || (allMembers as any[]).length === 0) return false;

    const members: GlobalMember[] = (allMembers as any[]).map((m) => ({
      userId: Number(m.user_id),
      leagueId: Number(m.league_id),
      points: Number(m.accumulated_points ?? 0),
    }));

    const individualPool = round2(totalPool * 0.5);
    const leaguePool = round2(totalPool * 0.5);

    const top3 = this.getTop3(members);
    const bestLeagueMembers = this.getBestLeagueMembers(members, leagueIds);

    // Pay top-3 individuals (50 / 25 / 10 of the individual half)
    if (top3[0])
      await this.payUser(
        top3[0].userId,
        round2(individualPool * 0.5),
        'Premio Global — 1er lugar individual',
      );
    if (top3[1])
      await this.payUser(
        top3[1].userId,
        round2(individualPool * 0.25),
        'Premio Global — 2do lugar individual',
      );
    if (top3[2])
      await this.payUser(
        top3[2].userId,
        round2(individualPool * 0.1),
        'Premio Global — 3er lugar individual',
      );

    // Pay all members of the best-avg-points league equally
    if (bestLeagueMembers.length > 0) {
      const share = round2(leaguePool / bestLeagueMembers.length);
      for (const m of bestLeagueMembers) {
        await this.payUser(m.userId, share, 'Premio Global — Liga campeona');
      }
    }

    // Mark as distributed (idempotency stamp)
    const now = new Date().toISOString();
    const operatorId = Number(this.auth.getInternalUserId());
    await this.db.client
      .from('WORLD_LEAGUE')
      .update({ global_prizes_distributed_at: now, updated_at: now, updated_by: operatorId } as any)
      .eq('world_league_id', mundialId);

    return true;
  }

  // Aggregate points per user across all leagues, return top 3 unique users
  private getTop3(members: GlobalMember[]): { userId: number }[] {
    const totals = new Map<number, number>();
    for (const m of members) {
      totals.set(m.userId, (totals.get(m.userId) ?? 0) + m.points);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([userId]) => ({ userId }));
  }

  // Return all members of the league with the highest average accumulated_points
  private getBestLeagueMembers(members: GlobalMember[], leagueIds: number[]): GlobalMember[] {
    let bestId = -1;
    let bestAvg = -1;

    for (const lid of leagueIds) {
      const group = members.filter((m) => m.leagueId === lid);
      if (group.length === 0) continue;
      const avg = group.reduce((s, m) => s + m.points, 0) / group.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestId = lid;
      }
    }

    return bestId === -1 ? [] : members.filter((m) => m.leagueId === bestId);
  }

  private async payUser(userId: number, amount: number, description: string): Promise<void> {
    if (amount <= 0) return;
    const walletRes = await this.walletSvc.getWallet(userId);
    if (walletRes.error || !walletRes.data) return;
    await this.walletSvc.deposit(
      walletRes.data.wallet_id,
      userId,
      amount,
      TRX_PREMIO_GLOBAL,
      description,
    );
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
