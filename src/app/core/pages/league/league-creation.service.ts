import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { MagicLinkService } from '../../../shared/components/notification-inbox/magic-link.service';
import { NotificationInboxService } from '../../../shared/components/notification-inbox/notification-inbox.service';

const MATCH_DURATION_MINUTES = 120;
const PREDICTION_CLOSE_MINUTES = 15;

export interface LeagueCreationPayload {
  name: string;
  /** catalog_id from CATALOG table (table_id=21). 23=Gratis, 24=Pago */
  catalogId: number;
  /** Cuota de entrada. 0 = gratis. >0 = liga de apuesta. */
  buyInAmount: number;
  createdBy: number;
}

export interface LeagueInvitePayload {
  emails: string[]; // Mix of registered and anonymous users
  leagueId: number;
  customMessage?: string;
  createdBy: number;
}

export interface PredictionLockInfo {
  matchId: number;
  isLocked: boolean;
  timeUntilEnd: number; // in minutes
  lockReason?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LeagueCreationService {
  private supabaseService = inject(SupabaseService);
  private magicLinkService = inject(MagicLinkService);
  private notificationService = inject(NotificationInboxService);

  /**
   * Creates a new league with initial configuration
   */
  async createLeague(
    payload: LeagueCreationPayload,
  ): Promise<{ success: boolean; leagueId?: number; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const buyInAmount = Math.max(0, Number(payload.buyInAmount ?? 0));

      // Get active WORLD_LEAGUE
      const { data: worldLeague, error: worldError } = await client
        .from('WORLD_LEAGUE')
        .select('world_league_id')
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle();

      if (worldError || !worldLeague) {
        return { success: false, error: 'No hay una World League activa configurada.' };
      }

      // Create league — catalog_id comes directly from the form (no neumonic lookup)
      const { data: leagueData, error: leagueError } = await client
        .from('LEAGUE')
        .insert({
          world_league_id: worldLeague.world_league_id,
          user_id: payload.createdBy,
          name: payload.name.trim(),
          catalog_id: payload.catalogId,
          buy_in_amount: buyInAmount,
          status: 'active',
          created_by: payload.createdBy,
          created_at: new Date().toISOString(),
          is_deleted: false,
        } as any)
        .select();

      if (leagueError) {
        console.error('Error creating league:', leagueError);
        return { success: false, error: leagueError.message };
      }

      const leagueId = leagueData?.[0]?.league_id;

      // Create LEAGUE_REWARD for paid leagues
      if (buyInAmount > 0) {
        await client.from('LEAGUE_REWARD').insert({
          league_id: leagueId,
          mundial_id: 1,
          total_collected_amount: 0,
          platform_fee_5pct: 0,
          global_prize_1pct: 0,
          created_by: payload.createdBy,
          created_at: new Date().toISOString(),
          is_deleted: false,
        } as any);
      }

      // Create default RULES_LEAGUE
      const defaultRules = [
        {
          dimension: 'scoring',
          value: '1_point_correct_result_3_points_exact_score',
          description: 'Puntuación: 1 punto por resultado correcto, 3 por marcador exacto',
        },
        {
          dimension: 'prediction_window',
          value: '15_minutes_before_match_start',
          description: 'Ventana de predicción: Cierra 15 minutos antes de iniciar el partido',
        },
        {
          dimension: 'match_duration',
          value: `${MATCH_DURATION_MINUTES}_minutes`,
          description: `Duración del partido: ${MATCH_DURATION_MINUTES} minutos`,
        },
      ];

      for (const rule of defaultRules) {
        await client.from('RULES_LEAGUE').insert({
          league_id: leagueId,
          dimension: rule.dimension,
          value: rule.value,
          description: rule.description,
          created_by: payload.createdBy,
          created_at: new Date().toISOString(),
          is_deleted: false,
        } as any);
      }

      // Note: creator is auto-joined by trg_auto_join_league_creator DB trigger (v3.53)

      return { success: true, leagueId };
    } catch (error) {
      console.error('League creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends league invitations to mix of registered and anonymous users
   */
  async sendLeagueInvitations(payload: LeagueInvitePayload): Promise<{
    success: boolean;
    registered: number;
    anonymous: number;
    failed: number;
    error?: string;
  }> {
    let registeredCount = 0;
    let anonymousCount = 0;
    let failedCount = 0;

    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          registered: 0,
          anonymous: 0,
          failed: 0,
          error: 'Supabase client not initialized',
        };
      }

      for (const email of payload.emails) {
        try {
          // Check if user is registered
          const { data: user, error: userError } = await client
            .from('USER')
            .select('user_id, email')
            .eq('email', email.toLowerCase())
            .eq('is_deleted', false)
            .maybeSingle();

          if (user) {
            // Registered user: add directly to league
            const inviteResult = await this.inviteRegisteredUser(
              payload.leagueId,
              user.user_id,
              payload.createdBy,
            );
            if (inviteResult.success) {
              registeredCount++;
            } else {
              failedCount++;
            }
          } else {
            // Anonymous user: generate magic link
            const magicLinkResult = await this.magicLinkService.generateMagicLink(
              email,
              payload.leagueId,
              payload.createdBy,
            );
            if (magicLinkResult.success) {
              anonymousCount++;
              // Magic link is persisted for in-app retrieval and onboarding flow
            } else {
              failedCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing invitation for ${email}:`, error);
          failedCount++;
        }
      }

      return {
        success: registeredCount + anonymousCount > 0,
        registered: registeredCount,
        anonymous: anonymousCount,
        failed: failedCount,
      };
    } catch (error) {
      console.error('Invitation sending error:', error);
      return {
        success: false,
        registered: registeredCount,
        anonymous: anonymousCount,
        failed: failedCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Invites a registered user to a league
   */
  private async inviteRegisteredUser(
    leagueId: number,
    userId: number,
    createdBy: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      // Check if already a member
      const { data: existing } = await client
        .from('USER_LEAGUE')
        .select('user_league_id')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'User already in league' };
      }

      // Create INVITATION record
      const { error: inviteError } = await client.from('INVITATION').insert({
        user_league_id: 0, // Will be resolved when user accepts
        status: 'pending',
        send_date: new Date().toISOString(),
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: createdBy,
        created_at: new Date().toISOString(),
        is_deleted: false,
      } as any);

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        return { success: false, error: inviteError.message };
      }

      // Store in-app notification and optionally surface it in the browser
      await this.notificationService.sendNotification(
        {
          userId,
          leagueId,
          type: 'invitation_received',
          title: '📬 Invitación a liga',
          body: 'Has sido invitado a unirte a una nueva liga de predicciones',
          actionUrl: `/invitations`,
          data: { leagueId, action: 'view_invitation' },
        },
        createdBy,
      );

      return { success: true };
    } catch (error) {
      console.error('Error inviting registered user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Adds a user to a league
   */
  async addUserToLeague(
    leagueId: number,
    userId: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { error } = await client
        .from('USER_LEAGUE')
        .insert({
          user_id: userId,
          league_id: leagueId,
          accumulated_points: 0,
          approval_status: 'approved',
          created_at: new Date().toISOString(),
          is_deleted: false,
        } as any)
        .select();

      if (error) {
        console.error('Error adding user to league:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in addUserToLeague:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Checks if predictions are locked for a match
   */
  async isPredictionLocked(matchId: number): Promise<PredictionLockInfo> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { matchId, isLocked: false, timeUntilEnd: 0 };
      }

      // Get match end time; predictions close 15 minutes before the final whistle.
      const { data: match, error: matchError } = await client
        .from('MATCH')
        .select('start_time, end_time')
        .eq('match_id', matchId)
        .maybeSingle();

      if (matchError || !match) {
        return { matchId, isLocked: false, timeUntilEnd: 0 };
      }

      const endTime = new Date(match.end_time ?? match.start_time);
      const now = new Date();
      const minutesUntilEnd = (endTime.getTime() - now.getTime()) / (1000 * 60);

      // Check if lock exists
      const { data: lock } = await client
        .from('PREDICTION_LOCK')
        .select('*')
        .eq('match_id', matchId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (lock) {
        return {
          matchId,
          isLocked: true,
          timeUntilEnd: Math.max(0, minutesUntilEnd),
          lockReason: lock.lock_reason,
        };
      }

      if (minutesUntilEnd <= 16 && minutesUntilEnd > 15) {
        await this.send15MinuteReminder(matchId);
      }

      // Auto-lock if within the final 15 minutes of the match.
      if (minutesUntilEnd <= PREDICTION_CLOSE_MINUTES && minutesUntilEnd > 0) {
        await this.lockPredictions(matchId, 'auto_15min');
        return {
          matchId,
          isLocked: true,
          timeUntilEnd: minutesUntilEnd,
          lockReason: 'auto_15min',
        };
      }

      return {
        matchId,
        isLocked: minutesUntilEnd <= 0,
        timeUntilEnd: Math.max(0, minutesUntilEnd),
      };
    } catch (error) {
      console.error('Error checking prediction lock:', error);
      return { matchId, isLocked: false, timeUntilEnd: 0 };
    }
  }

  /**
   * Locks predictions for a match
   */
  async lockPredictions(
    matchId: number,
    reason: 'auto_15min' | 'manual_admin' = 'auto_15min',
    lockedBy?: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      // Check if already locked
      const { data: existing } = await client
        .from('PREDICTION_LOCK')
        .select('prediction_lock_id')
        .eq('match_id', matchId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existing) {
        return { success: true }; // Already locked
      }

      const { error } = await client
        .from('PREDICTION_LOCK')
        .insert({
          match_id: matchId,
          lock_reason: reason,
          locked_by: lockedBy || null,
          locked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          created_by: lockedBy || 1,
          is_deleted: false,
        } as any)
        .select();

      if (error) {
        console.error('Error locking predictions:', error);
        return { success: false, error: error.message };
      }

      // Send notifications to all league members
      const { data: leagues } = await client
        .from('MATCH')
        .select('league_id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (leagues) {
        const { data: leagueMembers } = await client
          .from('USER_LEAGUE')
          .select('user_id')
          .eq('league_id', leagues.league_id)
          .eq('is_deleted', false);

        if (leagueMembers) {
          const userIds = (leagueMembers as Array<{ user_id: number }>).map(
            (member) => member.user_id,
          );
          await this.notificationService.sendBulkNotifications(
            leagues.league_id,
            userIds,
            {
              leagueId: leagues.league_id,
              matchId,
              type: 'prediction_locked',
              title: '🔒 Predicciones bloqueadas',
              body: 'Las predicciones quedaron cerradas. El partido entró en su ventana final.',
              actionUrl: `/league/${leagues.league_id}`,
              priority: 'high',
            },
            lockedBy || 1,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in lockPredictions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets all leagues for a user
   */
  async getUserLeagues(userId: number): Promise<any[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return [];

      const { data, error } = await client
        .from('LEAGUE')
        .select(
          `*,
          USER_LEAGUE!inner(*),
          WORLD_LEAGUE(*)
        `,
        )
        .eq('USER_LEAGUE.user_id', userId)
        .eq('USER_LEAGUE.is_deleted', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user leagues:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserLeagues:', error);
      return [];
    }
  }

  private async send15MinuteReminder(matchId: number): Promise<void> {
    const client = this.supabaseService.getClient();
    if (!client) return;

    const { data: matchRow, error: matchErr } = await client
      .from('MATCH')
      .select(
        'match_id, league_id, first_team_id, second_team_id, home:TEAM!MATCH_first_team_id_fkey(name), away:TEAM!MATCH_second_team_id_fkey(name)',
      )
      .eq('match_id', matchId)
      .maybeSingle();

    if (matchErr || !matchRow?.league_id) return;

    const { data: existingReminder } = await client
      .from('NOTIFICATION_INBOX')
      .select('notification_id')
      .eq('league_id', matchRow.league_id)
      .eq('match_id', matchId)
      .eq('notification_type', 'match_reminder')
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();

    if (existingReminder) return;

    const { data: members } = await client
      .from('USER_LEAGUE')
      .select('user_id')
      .eq('league_id', matchRow.league_id)
      .eq('is_deleted', false);

    if (!members || members.length === 0) return;

    const teamsInfo = `${(matchRow as any).home?.name ?? 'Equipo local'} vs ${(matchRow as any).away?.name ?? 'Equipo visitante'}`;
    const userIds = (members as Array<{ user_id: number }>).map((m) => m.user_id);

    await this.notificationService.sendBulkNotifications(
      matchRow.league_id,
      userIds,
      {
        leagueId: matchRow.league_id,
        matchId,
        type: 'match_reminder',
        title: '⏰ Quedan 15 minutos',
        body: `${teamsInfo}: en 15 minutos se cerrarán las predicciones.`,
        actionUrl: `/league/${matchRow.league_id}`,
        priority: 'high',
      },
      1,
    );
  }
}
