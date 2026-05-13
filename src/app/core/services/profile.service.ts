import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type UserProfileData = {
  user_id: number;
  name: string;
  login: string;
  email: string;
  registration_date: string;
  status: string;
};

export type WalletData = {
  wallet_id: number;
  balance: number;
  status: string;
};

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly _supabase = inject(SupabaseService);

  async loadProfile(userId: number) {
    return this._supabase.client
      .from('USER')
      .select('user_id, name, login, email, registration_date, status')
      .eq('user_id', userId)
      .single<UserProfileData>();
  }

  async loadWallet(userId: number) {
    return this._supabase.client
      .from('WALLET')
      .select('wallet_id, balance, status')
      .eq('user_id', userId)
      .single<WalletData>();
  }

  async updateProfile(userId: number, data: { name: string; login: string }) {
    return this._supabase.client
      .from('USER')
      .update(data)
      .eq('user_id', userId)
      .select('user_id, name, login, email, registration_date, status')
      .single<UserProfileData>();
  }
}
