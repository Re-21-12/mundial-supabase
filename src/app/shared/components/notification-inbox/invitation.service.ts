import { inject, Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { NotificationInboxService } from './notification-inbox.service';
import { SupabaseService } from '../../../core/services/supabase-service';
import { LeagueRoleService } from '../../../core/services/league-role.service';

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
  private readonly _notifications = inject(NotificationInboxService);
  private readonly _leagueRole = inject(LeagueRoleService);

  // ─── Existing user ────────────────────────────────────────────────────────

  async sendToExistingUser(email: string, leagueId: number, inviterId: number, approveDirectly = false) {
    const client = this._db.client;

    // 1. Find the user by email
    const { data: user, error: userErr } = await client
      .from('USER')
      .select('user_id, name')
      .eq('email', email)
      .single<{ user_id: number; name: string }>();

    if (userErr || !user) {
      console.error('[Invitation] USER lookup error:', userErr);
      return { success: false, error: 'No se encontró un usuario con ese email.' };
    }

    // 2. Upsert USER_LEAGUE with 'approved' — registered users join immediately
    const { data: existing } = await client
      .from('USER_LEAGUE')
      .select('user_league_id, is_deleted, approval_status')
      .eq('user_id', user.user_id)
      .eq('league_id', leagueId)
      .maybeSingle<{ user_league_id: number; is_deleted: boolean; approval_status: string }>();

    let userLeagueId: number;
    let alreadyMember = false;

    if (existing && !existing.is_deleted && existing.approval_status === 'approved') {
      alreadyMember = true;
      userLeagueId = existing.user_league_id;
    } else if (existing && existing.is_deleted) {
      // Soft-deleted — reactivate
      const approvalStatus = approveDirectly ? 'approved' : 'pending_approval';
      const { data: reactivated, error: reErr } = await client
        .from('USER_LEAGUE')
        .update({
          is_deleted: false,
          approval_status: approvalStatus,
          updated_at: new Date().toISOString(),
          updated_by: inviterId,
        } as any)
        .eq('user_league_id', existing.user_league_id)
        .select('user_league_id')
        .single<{ user_league_id: number }>();

      if (reErr || !reactivated) {
        return { success: false, error: 'Error al reactivar la participación en liga.' };
      }
      userLeagueId = reactivated.user_league_id;
    } else if (existing && !existing.is_deleted) {
      // Pending/rejected → update status based on who is inviting
      await client
        .from('USER_LEAGUE')
        .update({
          approval_status: approveDirectly ? 'approved' : 'pending_approval',
          updated_at: new Date().toISOString(),
          updated_by: inviterId,
        } as any)
        .eq('user_league_id', existing.user_league_id);
      userLeagueId = existing.user_league_id;
    } else {
      // Fresh record
      const { data: ul, error: ulErr } = await client
        .from('USER_LEAGUE')
        .insert({
          league_id: leagueId,
          user_id: user.user_id,
          created_by: inviterId,
          accumulated_points: 0,
          approval_status: approveDirectly ? 'approved' : 'pending_approval',
        } as any)
        .select('user_league_id')
        .single<{ user_league_id: number }>();

      if (ulErr || !ul) {
        console.error('[Invitation] USER_LEAGUE insert error:', ulErr);
        return { success: false, error: 'Error al crear la participación en liga.' };
      }
      userLeagueId = ul.user_league_id;
    }

    // 3. Assign role immediately only when approved; pending = role assigned on approval
    if (!alreadyMember && approveDirectly) {
      this._leagueRole
        .ensureLeagueMemberRole(user.user_id, inviterId)
        .catch((err) => console.warn('[Invitation] Role assignment failed:', err));
    }

    // 3b. When pending, notify the league owner to approve/reject
    if (!alreadyMember && !approveDirectly) {
      const { data: leagueRow } = await client
        .from('LEAGUE')
        .select('user_id, name')
        .eq('league_id', leagueId)
        .maybeSingle<{ user_id: number; name: string }>();

      if (leagueRow?.user_id && leagueRow.user_id !== inviterId) {
        this._notifications
          .sendNotification(
            {
              userId: leagueRow.user_id,
              leagueId,
              type: 'participant_approval',
              title: 'Solicitud de ingreso a liga',
              body: `${user.name ?? email} quiere unirse a ${leagueRow.name ?? 'tu liga'}. Aprueba o rechaza su solicitud.`,
              actionUrl: `/league/${leagueId}/approvals`,
              priority: 'high',
              data: { userLeagueId, userId: user.user_id, userName: user.name ?? '', userEmail: email },
            },
            inviterId,
          )
          .catch((err) => console.warn('[Invitation] Pending approval notification failed:', err));
      }
    }

    // 4. Create token + expiry (link lets them navigate directly to the league)
    const token = uuidv4();
    const expiration = new Date(Date.now() + EXPIRATION_HOURS * 3_600_000).toISOString();

    // 4. Create MAGIC_LINK
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
      console.error('[Invitation] MAGIC_LINK insert error (existing user):', mlErr);
    }

    // 5. Create INVITATION record
    const { error: invErr } = await client.from('INVITATION').insert({
      user_league_id: userLeagueId,
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
      return {
        success: false,
        error: `Error al registrar la invitación. (${invErr.code}: ${invErr.message})`,
      };
    }

    // 6. Notify the user that they were added (skip if already a member)
    if (!alreadyMember) {
      const { data: league } = await client
        .from('LEAGUE')
        .select('name')
        .eq('league_id', leagueId)
        .single<{ name: string }>();

      this._notifications
        .sendNotification(
          {
            userId: user.user_id,
            leagueId,
            type: 'league_update',
            title: '¡Te agregaron a una liga!',
            body: `Fuiste añadido a ${league?.name ?? 'una liga'}. Ya puedes participar.`,
            actionUrl: `/league/${leagueId}/standings`,
            priority: 'high',
          },
          inviterId,
        )
        .catch((err) => console.warn('[Invitation] Join notification failed:', err));
    }

    const emailSent = await this._sendEmail(email, token, leagueId, 'existing');
    return { success: true, token, emailSent };
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
      return {
        success: false,
        error: `Error al generar el enlace mágico. (${mlErr.code}: ${mlErr.message})`,
      };
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
      return {
        success: false,
        error: `Error al registrar la invitación. (${invErr.code}: ${invErr.message})`,
      };
    }

    const emailSent = await this._sendEmail(email, token, leagueId, 'anonymous');
    return { success: true, token, emailSent };
  }

  // ─── Email ────────────────────────────────────────────────────────────────

  private async _sendEmail(
    email: string,
    token: string,
    leagueId: number,
    type: InvitationType,
  ): Promise<boolean> {
    try {
      const res = await this._db.client.functions.invoke('send-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email, token, leagueId, type, appUrl: window.location.origin },
      } as any);

      if (res && (res as any).error) {
        console.warn('[Invitation] Email not sent (function returned error):', (res as any).error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[Invitation] Email send failed:', err);
      try {
        const maybeResponse = (err as any)?.response;
        if (maybeResponse && typeof maybeResponse.text === 'function') {
          const text = await maybeResponse.text();
          console.warn('[Invitation] Function response body:', text);
        }
      } catch (innerErr) {
        // ignore
      }
      return false;
    }
  }

  // ─── Magic link redemption ───────────────────────────────────────────────

  async acceptMagicLink(
    token: string,
    userId: number,
    teamName?: string,
  ): Promise<{ leagueId?: number; pendingApproval?: boolean; error?: string }> {
    const client = this._db.client;

    const { data: ml, error: mlErr } = await client
      .from('MAGIC_LINK')
      .select('magic_link_id, league_id, expires_at, status')
      .eq('token', token)
      .single<{ magic_link_id: number; league_id: number; expires_at: string; status: string }>();

    if (mlErr || !ml) return { error: 'Token inválido o no encontrado.' };
    if (ml.status === 'used') return { error: 'Este enlace de invitación ya fue utilizado.' };
    if (new Date(ml.expires_at) < new Date())
      return { error: 'Este enlace ha expirado (válido 48 h).' };

    const { data: existingUl } = await client
      .from('USER_LEAGUE')
      .select('user_league_id, is_deleted, approval_status')
      .eq('user_id', userId)
      .eq('league_id', ml.league_id)
      .maybeSingle<{ user_league_id: number; is_deleted: boolean; approval_status: string }>();

    let userLeagueId: number;
    let alreadyApproved = false;

    if (existingUl && !existingUl.is_deleted) {
      if (existingUl.approval_status === 'approved') {
        // Already a full member
        alreadyApproved = true;
      }
      userLeagueId = existingUl.user_league_id;
    } else if (existingUl && existingUl.is_deleted) {
      // Reactivate with pending_approval
      await client
        .from('USER_LEAGUE')
        .update({
          is_deleted: false,
          approval_status: 'pending_approval',
          team_name: teamName?.trim() || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_league_id', existingUl.user_league_id);
      userLeagueId = existingUl.user_league_id;
    } else {
      const { data: ul, error: ulErr } = await client
        .from('USER_LEAGUE')
        .insert({
          user_id: userId,
          league_id: ml.league_id,
          accumulated_points: 0,
          approval_status: 'pending_approval',
          team_name: teamName?.trim() || null,
        } as any)
        .select('user_league_id')
        .single<{ user_league_id: number }>();

      if (ulErr || !ul) return { error: 'No se pudo completar la unión a la liga.' };
      userLeagueId = ul.user_league_id;
    }

    await client
      .from('MAGIC_LINK')
      .update({ status: 'used', used_at: new Date().toISOString(), used_by: userId } as any)
      .eq('magic_link_id', ml.magic_link_id);

    if (alreadyApproved) {
      return { leagueId: ml.league_id };
    }

    // Notify league owner with approve/reject payload
    const [userResult, leagueResult] = await Promise.all([
      client
        .from('USER')
        .select('name, email')
        .eq('user_id', userId)
        .single<{ name: string; email: string }>(),
      client
        .from('LEAGUE')
        .select('user_id, name')
        .eq('league_id', ml.league_id)
        .single<{ user_id: number; name: string }>(),
    ]);

    const leagueOwner = leagueResult.data;
    const joiningUser = userResult.data;

    if (leagueOwner?.user_id && leagueOwner.user_id !== userId) {
      this._notifications
        .sendNotification(
          {
            userId: leagueOwner.user_id,
            leagueId: ml.league_id,
            type: 'participant_approval',
            title: 'Solicitud de ingreso a liga',
            body: `${joiningUser?.name ?? joiningUser?.email ?? 'Un usuario'} quiere unirse a ${leagueOwner.name ?? 'tu liga'}. Aprueba o rechaza su solicitud.`,
            actionUrl: `/league/${ml.league_id}/standings`,
            priority: 'high',
            data: {
              userLeagueId,
              userId,
              userName: joiningUser?.name ?? '',
              userEmail: joiningUser?.email ?? '',
              leagueName: leagueOwner.name ?? '',
            },
          },
          userId,
        )
        .catch((err) => console.warn('[Invitation] Approval notification failed:', err));
    }

    return { leagueId: ml.league_id, pendingApproval: true };
  }

  // ─── Approve / Reject participant ─────────────────────────────────────────

  async approveParticipant(
    userLeagueId: number,
    approverId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const client = this._db.client;

    const { data: ul, error: ulErr } = await client
      .from('USER_LEAGUE')
      .select('user_id, league_id, LEAGUE(name)')
      .eq('user_league_id', userLeagueId)
      .single<{ user_id: number; league_id: number; LEAGUE: { name: string } | null }>();

    if (ulErr || !ul) return { success: false, error: 'Participante no encontrado.' };

    const { error: updateErr } = await client
      .from('USER_LEAGUE')
      .update({
        approval_status: 'approved',
        updated_at: new Date().toISOString(),
        updated_by: approverId,
      } as any)
      .eq('user_league_id', userLeagueId);

    if (updateErr) return { success: false, error: updateErr.message };

    // Assign user_league role now that the participant is approved
    this._leagueRole
      .ensureLeagueMemberRole(ul.user_id, approverId)
      .catch((err) => console.warn('[Invitation] Role assignment failed:', err));

    const leagueName = (ul.LEAGUE as any)?.name ?? 'la liga';

    this._notifications
      .sendNotification(
        {
          userId: ul.user_id,
          leagueId: ul.league_id,
          type: 'league_update',
          title: 'Solicitud aprobada',
          body: `Tu solicitud de ingreso a ${leagueName} fue aprobada. ¡Ya eres parte de la liga!`,
          actionUrl: `/league/${ul.league_id}/standings`,
          priority: 'high',
        },
        approverId,
      )
      .catch((err) => console.warn('[Invitation] Approval confirm notification failed:', err));

    return { success: true };
  }

  async rejectParticipant(
    userLeagueId: number,
    rejecterId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const client = this._db.client;

    const { data: ul, error: ulErr } = await client
      .from('USER_LEAGUE')
      .select('user_id, league_id, LEAGUE(name)')
      .eq('user_league_id', userLeagueId)
      .single<{ user_id: number; league_id: number; LEAGUE: { name: string } | null }>();

    if (ulErr || !ul) return { success: false, error: 'Participante no encontrado.' };

    const { error: updateErr } = await client
      .from('USER_LEAGUE')
      .update({
        approval_status: 'rejected',
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: rejecterId,
        updated_at: new Date().toISOString(),
        updated_by: rejecterId,
      } as any)
      .eq('user_league_id', userLeagueId);

    if (updateErr) return { success: false, error: updateErr.message };

    const leagueName = (ul.LEAGUE as any)?.name ?? 'la liga';

    this._notifications
      .sendNotification(
        {
          userId: ul.user_id,
          leagueId: ul.league_id,
          type: 'league_update',
          title: 'Solicitud rechazada',
          body: `Tu solicitud de ingreso a ${leagueName} no fue aprobada en esta ocasión.`,
          priority: 'normal',
        },
        rejecterId,
      )
      .catch((err) => console.warn('[Invitation] Rejection notification failed:', err));

    return { success: true };
  }

  // ─── Check approved membership ───────────────────────────────────────────

  async isApprovedMember(userId: number, leagueId: number): Promise<boolean> {
    const { data } = await this._db.client
      .from('USER_LEAGUE')
      .select('user_league_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .eq('approval_status', 'approved')
      .eq('is_deleted', false)
      .maybeSingle<{ user_league_id: number }>();
    return !!data;
  }

  // ─── Public token lookup (no auth required) ──────────────────────────────

  async getLeagueFromToken(
    token: string,
  ): Promise<{ leagueId: number; leagueName: string } | null> {
    const { data, error } = await this._db.client
      .from('MAGIC_LINK')
      .select('league_id, LEAGUE(name)')
      .eq('token', token)
      .eq('status', 'pending')
      .single<{ league_id: number; LEAGUE: { name: string } }>();

    if (error || !data) return null;
    return { leagueId: data.league_id, leagueName: (data as any).LEAGUE?.name ?? 'Liga' };
  }

  // ─── Recipient views ──────────────────────────────────────────────────────

  async getPendingForUser(userEmail: string) {
    const { data, error } = await this._db.client
      .from('INVITATION')
      .select(
        `
        invitation_id, email, invitation_type, status,
        send_date, expiration_date, token, league_id,
        LEAGUE ( name )
      `,
      )
      .eq('email', userEmail)
      .eq('status', 'pending')
      .eq('is_deleted', false)
      .order('send_date', { ascending: false });

    const mapped: PendingInvitation[] = (data ?? []).map((row: any) => ({
      invitation_id: row.invitation_id,
      email: row.email,
      invitation_type: row.invitation_type,
      status: row.status,
      send_date: row.send_date,
      expiration_date: row.expiration_date,
      token: row.token,
      league_id: row.league_id,
      league_name: row.LEAGUE?.name ?? undefined,
    }));

    return { data: mapped, error };
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
