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
}
