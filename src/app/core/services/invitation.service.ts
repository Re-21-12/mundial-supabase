import { inject, Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from './supabase-service';

export type InvitationType = 'existing' | 'anonymous';

export type PendingInvitation = {
  invitation_id: number;
  email: string;
  invitation_type: InvitationType;
  status: string;
  send_date: string;
  expiration_date: string;
  token: string | null;
  league_id: number | null;
  league_name?: string;
};

const EXPIRATION_HOURS = 48;

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly _db = inject(SupabaseService);

  // ─── Existing user ────────────────────────────────────────────────────────

  async sendToExistingUser(email: string, leagueId: number, inviterId: number) {
    const client = this._db.client;

    // 1. Find the user by email
    const { data: user, error: userErr } = await client
      .from('USER')
      .select('user_id')
      .eq('email', email)
      .single<{ user_id: number }>();

    if (userErr || !user) {
      console.error('[Invitation] USER lookup error:', userErr);
      return { success: false, error: 'No se encontró un usuario con ese email.' };
    }

    // 2. Create USER_LEAGUE record (status managed at application level)
    const { data: ul, error: ulErr } = await client
      .from('USER_LEAGUE')
      .insert({ league_id: leagueId, user_id: user.user_id, created_by: inviterId, accumulated_points: 0 })
      .select('user_league_id')
      .single<{ user_league_id: number }>();

    if (ulErr) {
      console.error('[Invitation] USER_LEAGUE insert error:', ulErr);
      return { success: false, error: `Error al crear la participación en liga. (${ulErr.code}: ${ulErr.message})` };
    }

    // 3. Create INVITATION record
    const token = uuidv4();
    const expiration = new Date(Date.now() + EXPIRATION_HOURS * 3_600_000).toISOString();

    const { error: invErr } = await client.from('INVITATION').insert({
      user_league_id: ul.user_league_id,
      email,
      invitation_type: 'existing',
      league_id: leagueId,
      token,
      status: 'pending',
      send_date: new Date().toISOString(),
      expiration_date: expiration,
      created_by: inviterId,
    } as any);

    if (invErr) {
      console.error('[Invitation] INVITATION insert error:', invErr);
      return { success: false, error: `Error al registrar la invitación. (${invErr.code}: ${invErr.message})` };
    }

    return { success: true, token };
  }

  // ─── Anonymous user ───────────────────────────────────────────────────────

  async sendToAnonymous(email: string, leagueId: number, inviterId: number) {
    const client = this._db.client;
    const token = uuidv4();
    const expiration = new Date(Date.now() + EXPIRATION_HOURS * 3_600_000).toISOString();

    // 1. Create MAGIC_LINK (handles registration + league join)
    const { error: mlErr } = await client.from('MAGIC_LINK').insert({
      token,
      email: email.toLowerCase(),
      league_id: leagueId,
      expires_at: expiration,
      status: 'pending',
      created_by: inviterId,
      created_at: new Date().toISOString(),
    } as any);

    if (mlErr) {
      console.error('[Invitation] MAGIC_LINK insert error:', mlErr);
      return { success: false, error: `Error al generar el enlace mágico. (${mlErr.code}: ${mlErr.message})` };
    }

    // 2. Create INVITATION (no user_league_id yet — user doesn't exist)
    const { error: invErr } = await client.from('INVITATION').insert({
      email: email.toLowerCase(),
      invitation_type: 'anonymous',
      league_id: leagueId,
      token,
      status: 'pending',
      send_date: new Date().toISOString(),
      expiration_date: expiration,
      created_by: inviterId,
    } as any);

    if (invErr) {
      console.error('[Invitation] INVITATION insert error:', invErr);
      return { success: false, error: `Error al registrar la invitación. (${invErr.code}: ${invErr.message})` };
    }

    return { success: true, token };
  }

  // ─── Recipient views ──────────────────────────────────────────────────────

  async getPendingForUser(userEmail: string) {
    const { data, error } = await this._db.client
      .from('INVITATION')
      .select(`
        invitation_id, email, invitation_type, status,
        send_date, expiration_date, token, league_id,
        LEAGUE ( name )
      `)
      .eq('email', userEmail)
      .eq('status', 'pending')
      .order('send_date', { ascending: false })
      .returns<PendingInvitation[]>();

    return { data: data ?? [], error };
  }

  async accept(invitationId: number) {
    return this._db.client
      .from('INVITATION')
      .update({ status: 'accepted', updated_at: new Date().toISOString() } as any)
      .eq('invitation_id', invitationId);
  }

  async decline(invitationId: number) {
    return this._db.client
      .from('INVITATION')
      .update({ status: 'declined', updated_at: new Date().toISOString() } as any)
      .eq('invitation_id', invitationId);
  }

  // ─── Admin: list sent invitations ────────────────────────────────────────

  async getSentByLeague(leagueId: number) {
    const { data, error } = await this._db.client
      .from('INVITATION')
      .select('invitation_id, email, invitation_type, status, send_date, expiration_date')
      .eq('league_id', leagueId)
      .order('send_date', { ascending: false })
      .returns<PendingInvitation[]>();

    return { data: data ?? [], error };
  }
}
