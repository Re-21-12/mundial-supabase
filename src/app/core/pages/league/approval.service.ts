import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { LeagueRoleService } from '../../services/league-role.service';

export type PendingParticipant = {
  user_league_id: number;
  user_id: number;
  league_id: number;
  approval_status: string;
  team_name: string | null;
  created_at: string;
  USER?: { name?: string | null; email?: string | null } | null;
};

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private readonly _db = inject(SupabaseService);
  private readonly _leagueRole = inject(LeagueRoleService);

  // ── Query helpers ─────────────────────────────────────────────────────────

  async getLeagueInfo(leagueId: number): Promise<{ name: string; ownerId: number } | null> {
    const { data } = await this._db.client
      .from('LEAGUE')
      .select('name, user_id')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .maybeSingle();
    if (!data) return null;
    return { name: (data as any).name, ownerId: (data as any).user_id };
  }

  async getPendingCount(leagueId: number): Promise<number> {
    const { count } = await this._db.client
      .from('USER_LEAGUE')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('approval_status', 'pending_approval')
      .eq('is_deleted', false);
    return count ?? 0;
  }

  async getPendingParticipants(leagueId: number) {
    const { data, error } = await this._db.client
      .from('USER_LEAGUE')
      .select(`
        user_league_id, user_id, league_id, approval_status, team_name, created_at,
        USER ( name, email )
      `)
      .eq('league_id', leagueId)
      .eq('approval_status', 'pending_approval')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .returns<PendingParticipant[]>();
    return { data: data ?? [], error };
  }

  // ── Core approve / reject (no notifications) ──────────────────────────────

  async approve(userLeagueId: number, adminId: number) {
    return this._db.client
      .from('USER_LEAGUE')
      .update({
        approval_status: 'approved',
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('user_league_id', userLeagueId);
  }

  async reject(userLeagueId: number, adminId: number) {
    const now = new Date().toISOString();
    return this._db.client
      .from('USER_LEAGUE')
      .update({
        approval_status: 'rejected',
        is_deleted: true,
        deleted_at: now,
        deleted_by: adminId,
        updated_by: adminId,
        updated_at: now,
      } as any)
      .eq('user_league_id', userLeagueId);
  }

  // ── Approve + notify user + clear inbox notification ──────────────────────

  async approveWithNotification(
    userLeagueId: number,
    adminId: number,
    leagueName: string,
    userId: number,
    leagueId: number,
  ) {
    const now = new Date().toISOString();

    // 1. Update approval status
    await this.approve(userLeagueId, adminId);

    // 2. Assign user_league role (idempotent)
    this._leagueRole
      .ensureLeagueMemberRole(userId, adminId)
      .catch((err) => console.warn('[Approval] Role assignment failed:', err));

    // 4. Notify the user they were accepted
    await this._db.client.from('NOTIFICATION_INBOX').insert({
      user_id: userId,
      league_id: leagueId,
      notification_type: 'league_update',
      title: '¡Solicitud aprobada!',
      body: `Fuiste aceptado en la liga "${leagueName}". ¡Bienvenido!`,
      priority: 'normal',
      action_url: `/league/${leagueId}/standings`,
      payload: { leagueId, leagueName },
      is_read: false,
      browser_notification_sent: false,
      created_by: adminId,
      created_at: now,
      is_deleted: false,
    } as any);

    // 5. Soft-delete the participant_approval notification from the admin's inbox
    await this._clearApprovalNotification(userLeagueId, leagueId, adminId, now);
  }

  // ── Reject + notify user + clear inbox notification ───────────────────────

  async rejectWithNotification(
    userLeagueId: number,
    adminId: number,
    leagueName: string,
    userId: number,
    leagueId: number,
  ) {
    const now = new Date().toISOString();

    // 1. Soft-delete the USER_LEAGUE row
    await this.reject(userLeagueId, adminId);

    // 2. Notify the user they were rejected
    await this._db.client.from('NOTIFICATION_INBOX').insert({
      user_id: userId,
      league_id: leagueId,
      notification_type: 'league_update',
      title: 'Solicitud rechazada',
      body: `Tu solicitud para unirte a la liga "${leagueName}" fue rechazada.`,
      priority: 'normal',
      action_url: '/home',
      payload: { leagueId, leagueName },
      is_read: false,
      browser_notification_sent: false,
      created_by: adminId,
      created_at: now,
      is_deleted: false,
    } as any);

    // 3. Soft-delete the participant_approval notification from the admin's inbox
    await this._clearApprovalNotification(userLeagueId, leagueId, adminId, now);
  }

  // ── Internal helper ───────────────────────────────────────────────────────

  private async _clearApprovalNotification(
    userLeagueId: number,
    leagueId: number,
    adminId: number,
    now: string,
  ) {
    // Filter by owner's inbox + type + jsonb payload containment
    await this._db.client
      .from('NOTIFICATION_INBOX')
      .update({ is_deleted: true, updated_at: now } as any)
      .eq('user_id', adminId)
      .eq('league_id', leagueId)
      .eq('notification_type', 'participant_approval')
      .eq('is_deleted', false)
      .contains('payload', { userLeagueId } as any);
  }
}
