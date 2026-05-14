import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type WalletSummary = { wallet_id: number; balance: number; status: string };

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly _db = inject(SupabaseService);

  async getBalance(userId: number): Promise<number> {
    const { data } = await this._db.client
      .from('WALLET')
      .select('balance')
      .eq('user_id', userId)
      .single<{ balance: number }>();
    return data?.balance ?? 0;
  }

  async getWallet(userId: number) {
    return this._db.client
      .from('WALLET')
      .select('wallet_id, balance, status')
      .eq('user_id', userId)
      .single<WalletSummary>();
  }

  async deposit(
    walletId: number,
    userId: number,
    amount: number,
    catalogId: number,
    description: string,
  ): Promise<{ error: string | null }> {
    const now = new Date().toISOString();

    const { error: txErr } = await this._db.client.from('TRANSACTION').insert({
      wallet_id: walletId,
      amount,
      catalog_id: catalogId,
      description,
      transaction_date: now,
      created_by: userId,
      created_at: now,
      is_deleted: false,
    });

    if (txErr) return { error: txErr.message };

    const { data: wallet } = await this._db.client
      .from('WALLET')
      .select('balance')
      .eq('wallet_id', walletId)
      .single<{ balance: number }>();

    const newBalance = (wallet?.balance ?? 0) + amount;

    const { error: updateErr } = await this._db.client
      .from('WALLET')
      .update({ balance: newBalance, updated_at: now, updated_by: userId })
      .eq('wallet_id', walletId);

    if (updateErr) return { error: updateErr.message };
    return { error: null };
  }
}
