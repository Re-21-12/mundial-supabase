import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type AdminUser = {
  user_id: number;
  name: string;
  login: string;
  email: string;
  status: string;
  registration_date: string;
  uuid: string | null;
  is_deleted: boolean;
  openSessions?: number;
};

export type TsUserAction = 'CREATE_USER' | 'DELETE_USER' | 'RESET_PASSWORD';

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly _db = inject(SupabaseService);

  private get fnUrl(): string {
    return `${this._db.supabaseUrl}/functions/v1/admin-manage-user`;
  }

  private async callFn(body: Record<string, unknown>): Promise<{ data?: any; error?: string }> {
    const session = await this._db.client.auth.getSession();
    const token = session.data.session?.access_token ?? this._db.apiKey;

    const res = await fetch(this.fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: this._db.apiKey,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok || json.error) return { error: json.error ?? 'Error desconocido' };
    return { data: json };
  }

  async listUsers(): Promise<AdminUser[]> {
    const { data, error } = await this._db.client
      .from('USER')
      .select('user_id, name, login, email, status, registration_date, uuid, is_deleted')
      .eq('is_deleted', false)
      .order('user_id', { ascending: true });

    if (error) { console.error('[UserAdmin]', error); return []; }
    return (data ?? []) as AdminUser[];
  }

  async getOpenSessionCount(userId: number): Promise<number> {
    const { data, error } = await this._db.client
      .rpc('fn_open_session_count', { p_user_id: userId });
    if (error) return 0;
    return (data as number) ?? 0;
  }

  async createUser(
    email: string, password: string, name: string, login: string, performedBy: number,
  ): Promise<{ error?: string }> {
    const { data, error } = await this.callFn({ action: 'create', email, password, name, login });
    await this.logAction('CREATE_USER', email, null, performedBy, error ? 'error' : 'success', error);
    return { error };
  }

  async resetPassword(
    user: AdminUser, newPassword: string, performedBy: number,
  ): Promise<{ error?: string }> {
    if (!user.uuid) return { error: 'El usuario no tiene UUID de autenticación' };
    const { error } = await this.callFn({ action: 'reset_password', user_uuid: user.uuid, new_password: newPassword });
    await this.logAction('RESET_PASSWORD', user.email, user.user_id, performedBy, error ? 'error' : 'success', error);
    return { error };
  }

  async deleteUser(user: AdminUser, performedBy: number): Promise<{ error?: string }> {
    // Hard delete from auth first (if has uuid)
    if (user.uuid) {
      const { error } = await this.callFn({ action: 'delete', user_uuid: user.uuid });
      if (error) {
        await this.logAction('DELETE_USER', user.email, user.user_id, performedBy, 'error', error);
        return { error };
      }
    }

    // Hard delete from USER table
    const { error: dbErr } = await this._db.client
      .from('USER')
      .delete()
      .eq('user_id', user.user_id);

    const errMsg = dbErr?.message;
    await this.logAction('DELETE_USER', user.email, user.user_id, performedBy, dbErr ? 'error' : 'success', errMsg);
    return { error: errMsg };
  }

  private async logAction(
    action: TsUserAction,
    email: string,
    targetUserId: number | null,
    performedBy: number,
    result: 'success' | 'error',
    errorMessage?: string,
  ): Promise<void> {
    await this._db.client.from('TS_USER').insert({
      action,
      target_email: email,
      target_user_id: targetUserId,
      performed_by: performedBy,
      result,
      error_message: errorMessage ?? null,
    });
  }
}
