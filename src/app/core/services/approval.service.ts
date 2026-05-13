import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type PendingParticipant = {
  user_league_id: number;
  user_id: number;
  league_id: number;
  approval_status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
};

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private readonly _db = inject(SupabaseService);

  async getPendingParticipants(leagueId: number) {
    const { data, error } = await this._db.client
      .from('USER_LEAGUE')
      .select(`
        user_league_id, user_id, league_id, approval_status, created_at,
        USER ( name, email )
      `)
      .eq('league_id', leagueId)
      .eq('approval_status', 'pending_approval')
      .order('created_at', { ascending: true })
      .returns<PendingParticipant[]>();
    return { data: data ?? [], error };
  }

  async approve(userLeagueId: number, adminId: number) {
    return this._db.client
      .from('USER_LEAGUE')
      .update({ approval_status: 'approved', updated_by: adminId, updated_at: new Date().toISOString() } as any)
      .eq('user_league_id', userLeagueId);
  }

  async reject(userLeagueId: number, adminId: number) {
    return this._db.client
      .from('USER_LEAGUE')
      .update({ approval_status: 'rejected', updated_by: adminId, updated_at: new Date().toISOString() } as any)
      .eq('user_league_id', userLeagueId);
  }
}
