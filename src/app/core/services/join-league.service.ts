import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

@Injectable({ providedIn: 'root' })
export class JoinLeagueService {
  private readonly _db = inject(SupabaseService);

  async joinByCode(code: string, userId: number): Promise<{ error?: string; leagueId?: number }> {
    const { data: league, error: findErr } = await this._db.client
      .from('LEAGUE')
      .select('league_id, name, status')
      .eq('invitation_code', code.trim())
      .eq('is_deleted', false)
      .single();

    if (findErr || !league) return { error: 'Código de invitación inválido o liga no encontrada.' };
    if (league.status !== 'active') return { error: `La liga "${league.name}" no está activa.` };

    const { error: insertErr } = await this._db.client
      .from('USER_LEAGUE')
      .insert({ user_id: userId, league_id: league.league_id, accumulated_points: 0 });

    if (insertErr) return { error: 'Ya eres miembro de esta liga o no se pudo unir.' };
    return { leagueId: league.league_id };
  }
}
