import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { LeagueRoleService } from '../../services/league-role.service';
import { WalletService } from '../admin/wallet/wallet.service';

export interface LeaguePreview {
  leagueId: number;
  name: string;
  buyInAmount: number;
  status: string | null;
  isBettingLeague: boolean;
  invitationCode: string | null;
}

@Injectable({ providedIn: 'root' })
export class JoinLeagueService {
  private readonly _db = inject(SupabaseService);
  private readonly _wallet = inject(WalletService);
  private readonly _leagueRole = inject(LeagueRoleService);

  // ── Preview por código de invitación ──────────────────────────────────────

  async previewByCode(code: string): Promise<{ error?: string; league?: LeaguePreview }> {
    if (!code.trim()) return { error: 'Ingresa un código de invitación válido.' };

    const { data, error } = await this._db.client
      .from('LEAGUE')
      .select('league_id, name, buy_in_amount, status, invitation_code')
      .eq('invitation_code', code.trim())
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !data) return { error: 'Liga no encontrada. Verifica el código.' };

    const league = data as any;

    if (league.status === 'finished' || league.status === 'inactive') {
      return { error: 'Esta liga ya no acepta nuevos participantes.' };
    }

    return { league: this._toPreview(league) };
  }

  // ── Búsqueda por nombre ────────────────────────────────────────────────────

  async searchByName(query: string): Promise<LeaguePreview[]> {
    if (!query.trim()) return [];

    const { data } = await this._db.client
      .from('LEAGUE')
      .select('league_id, name, buy_in_amount, status, invitation_code')
      .ilike('name', `%${query.trim()}%`)
      .eq('is_deleted', false)
      .not('status', 'in', '("finished","inactive")')
      .order('name')
      .limit(10);

    return ((data ?? []) as any[]).map((row) => this._toPreview(row));
  }

  // ── Unirse a liga ──────────────────────────────────────────────────────────

  async joinByCode(
    code: string,
    userId: number,
  ): Promise<{ error?: string; leagueId?: number; pendingApproval?: boolean }> {
    if (!code.trim()) {
      return { error: 'Ingresa un código de invitación válido.' };
    }

    if (!userId) {
      return { error: 'Debes iniciar sesión o registrarte para ingresar a una liga.' };
    }

    // 1. Verificar que la liga exista
    const preview = await this.previewByCode(code);
    if (preview.error || !preview.league) {
      return { error: preview.error ?? 'No se pudo validar la liga.' };
    }

    const { buyInAmount, isBettingLeague, name, leagueId } = preview.league;

    // 2. Verificar wallet activa
    const walletRes = await this._wallet.getWallet(userId);
    if (walletRes.error || !walletRes.data) {
      return {
        error:
          'Tu cuenta no está completamente registrada. Asegúrate de tener una billetera activa antes de unirte.',
      };
    }

    // 3. Verificar saldo si es liga de apuesta
    if (isBettingLeague && walletRes.data.balance < buyInAmount) {
      return {
        error: `Saldo insuficiente. Necesitas $${buyInAmount} Q para unirte a "${name}". Tu saldo actual es $${walletRes.data.balance} Q.`,
      };
    }

    // 4. Join via RPC (handles entry-fee deduction atomically)
    const { data, error } = await this._db.client.rpc('join_league_with_entry_fee', {
      p_invitation_code: code.trim(),
      p_user_id: userId,
    });

    if (error) {
      if ((error as any).code === '23505') {
        return { error: 'Ya eres miembro de esta liga o tienes una solicitud pendiente.' };
      }
      return { error: error.message || 'No se pudo unir a la liga.' };
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      return { error: 'No se recibió respuesta al intentar ingresar a la liga.' };
    }

    if (row.error) {
      return { error: row.error };
    }

    if (!row.league_id) {
      return { error: 'No se pudo resolver la liga destino.' };
    }

    const joinedLeagueId = Number(row.league_id);

    // 5. Indicate pending approval if that's the current status
    const { data: ulStatus } = await this._db.client
      .from('USER_LEAGUE')
      .select('approval_status')
      .eq('user_id', userId)
      .eq('league_id', joinedLeagueId)
      .eq('is_deleted', false)
      .maybeSingle();

    const pendingApproval = (ulStatus as any)?.approval_status === 'pending_approval';

    // Assign user_league role only when the user is immediately approved (no manual approval needed)
    if (!pendingApproval) {
      this._leagueRole
        .ensureLeagueMemberRole(userId, userId)
        .catch((err) => console.warn('[JoinLeague] Role assignment failed:', err));
    }

    return { leagueId: joinedLeagueId, pendingApproval };
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private _toPreview(row: any): LeaguePreview {
    return {
      leagueId: row.league_id,
      name: row.name,
      buyInAmount: Number(row.buy_in_amount ?? 0),
      status: row.status,
      isBettingLeague: Number(row.buy_in_amount ?? 0) > 0,
      invitationCode: row.invitation_code ?? null,
    };
  }
}
