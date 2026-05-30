import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

const LEAGUE_MEMBER_ROLE_NAME = 'user_league';

@Injectable({ providedIn: 'root' })
export class LeagueRoleService {
  private readonly _db = inject(SupabaseService);
  private _cachedRoleId: number | null = null;

  private async _getRoleId(): Promise<number | null> {
    if (this._cachedRoleId !== null) return this._cachedRoleId;

    const { data } = await this._db.client
      .from('ROLE')
      .select('role_id')
      .eq('name', LEAGUE_MEMBER_ROLE_NAME)
      .eq('is_deleted', false)
      .maybeSingle<{ role_id: number }>();

    if (data) this._cachedRoleId = data.role_id;
    return this._cachedRoleId;
  }

  /**
   * Ensures the user has the `user_league` role, assigning it if missing.
   * Idempotent: safe to call multiple times for the same user.
   * Silently logs errors — never throws.
   */
  async ensureLeagueMemberRole(userId: number, assignedBy: number): Promise<void> {
    if (!userId || !assignedBy) return;

    try {
      const roleId = await this._getRoleId();
      if (!roleId) {
        console.warn('[LeagueRole] Role "user_league" not found in ROLE table.');
        return;
      }

      const now = new Date().toISOString();

      // Check for an active assignment first
      const { data: active } = await this._db.client
        .from('USER_ROLE')
        .select('user_role_id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_deleted', false)
        .maybeSingle<{ user_role_id: number }>();

      if (active) return; // Already has the role

      // Check for a soft-deleted assignment — reactivate rather than duplicate
      const { data: softDeleted } = await this._db.client
        .from('USER_ROLE')
        .select('user_role_id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_deleted', true)
        .maybeSingle<{ user_role_id: number }>();

      if (softDeleted) {
        await this._db.client
          .from('USER_ROLE')
          .update({
            is_deleted: false,
            updated_at: now,
            updated_by: assignedBy,
          } as any)
          .eq('user_role_id', softDeleted.user_role_id);
        return;
      }

      // Fresh insert
      await this._db.client.from('USER_ROLE').insert({
        user_id: userId,
        role_id: roleId,
        created_by: assignedBy,
        created_at: now,
        is_deleted: false,
      } as any);
    } catch (err) {
      console.error('[LeagueRole] Failed to assign user_league role:', err);
    }
  }
}
