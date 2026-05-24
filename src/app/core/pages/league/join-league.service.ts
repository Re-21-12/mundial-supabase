import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { WalletService } from '../wallet/wallet.service';

export interface LeaguePreview {
  leagueId: number;
  name: string;
  buyInAmount: number;
  status: string | null;
  isBettingLeague: boolean;
}

@Injectable({ providedIn: 'root' })
export class JoinLeagueService {
  private readonly _db = inject(SupabaseService);
  private readonly _wallet = inject(WalletService);

  // Previsualizar liga antes de unirse — permite mostrar info y validar saldo
  async previewByCode(code: string): Promise<{ error?: string; league?: LeaguePreview }> {
    if (!code.trim()) return { error: 'Ingresa un código de invitación válido.' };

    const { data, error } = await this._db.client
      .from('LEAGUE')
      .select('league_id, name, buy_in_amount, status')
      .eq('invitation_code', code.trim())
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !data) return { error: 'Liga no encontrada. Verifica el código.' };

    const league = data as any;

    if (league.status === 'closed') {
      return { error: 'Esta liga ya está cerrada y no acepta nuevos participantes.' };
    }

    return {
      league: {
        leagueId: league.league_id,
        name: league.name,
        buyInAmount: Number(league.buy_in_amount ?? 0),
        status: league.status,
        isBettingLeague: Number(league.buy_in_amount ?? 0) > 0,
      },
    };
  }

  async joinByCode(code: string, userId: number): Promise<{ error?: string; leagueId?: number }> {
    if (!code.trim()) {
      return { error: 'Ingresa un código de invitación válido.' };
    }

    if (!userId) {
      return { error: 'Debes iniciar sesión o registrarte para ingresar a una liga.' };
    }

    // ── 1. Verificar que la liga exista y no esté cerrada ──────────────────────
    const preview = await this.previewByCode(code);
    if (preview.error || !preview.league) {
      return { error: preview.error ?? 'No se pudo validar la liga.' };
    }

    const { buyInAmount, isBettingLeague, name } = preview.league;

    // ── 2. Verificar que el usuario tenga wallet activa (registro completo) ────
    const walletRes = await this._wallet.getWallet(userId);
    if (walletRes.error || !walletRes.data) {
      return {
        error:
          'Tu cuenta no está completamente registrada. Asegúrate de tener una billetera activa antes de unirte.',
      };
    }

    // ── 3. Verificar saldo si es liga de apuesta ───────────────────────────────
    if (isBettingLeague && walletRes.data.balance < buyInAmount) {
      return {
        error: `Saldo insuficiente. Necesitas $${buyInAmount} MXN para unirte a "${name}". Tu saldo actual es $${walletRes.data.balance} MXN.`,
      };
    }

    // ── 4. Proceder con el join (el RPC maneja el cobro de cuota en BD) ────────
    const { data, error } = await this._db.client.rpc('join_league_with_entry_fee', {
      p_invitation_code: code.trim(),
      p_user_id: userId,
    });

    if (error) {
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

    return { leagueId: Number(row.league_id) };
  }
}
