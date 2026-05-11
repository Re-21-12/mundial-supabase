import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase-service';
import { MagicLinkService } from './magic-link.service';
import { NotificationInboxService } from './notification-inbox.service';

export interface LeagueCreationPayload {
  name: string;
  leagueType: 'apuesta' | 'diversión'; // From CATALOG
  entryPrice?: number; // If leagueType is 'apuesta'
  description?: string;
  maxParticipants?: number;
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
  timeUntilStart: number; // in minutes
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

      // Get the correct catalog ID for league type
      const { data: catalogData, error: catalogError } = await client
        .from('CATALOG')
        .select('catalog_id')
        .eq('neumonic', payload.leagueType)
        .eq('table_name', 'LEAGUE')
        .maybeSingle();

      if (catalogError || !catalogData) {
        return { success: false, error: `Invalid league type: ${payload.leagueType}` };
      }

      // Get current WORLD_LEAGUE (default to 1 for 2026 World Cup)
      const { data: worldLeague, error: worldError } = await client
        .from('WORLD_LEAGUE')
        .select('world_league_id')
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle();

      if (worldError || !worldLeague) {
        return { success: false, error: 'No active World League found' };
      }

      // Create league
      const { data: leagueData, error: leagueError } = await client
        .from('LEAGUE')
        .insert({
          world_league_id: worldLeague.world_league_id,
          user_id: payload.createdBy,
          name: payload.name,
          catalog_id: catalogData.catalog_id,
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

      // Create LEAGUE_REWARD entry
      if (payload.leagueType === 'apuesta' && payload.entryPrice) {
        await client.from('LEAGUE_REWARD').insert({
          league_id: leagueId,
          mundial_id: 1, // 2026 World Cup
          total_collected_amount: 0,
          platform_fee_5pct: 0,
          global_prize_1pct: 0,
          created_by: payload.createdBy,
          created_at: new Date().toISOString(),
          is_deleted: false,
        } as any);
      }

      // Create RULES_LEAGUE with default rules
      const defaultRules = [
        {
          dimension: 'scoring',
          value: '1_point_correct_result_3_points_exact_score',
          description: 'Puntuación: 1 punto por resultado correcto, 3 por marcador exacto',
        },
        {
          dimension: 'prediction_window',
          value: '15_minutes_before_match',
          description: 'Ventana de predicción: Cierra 15 minutos antes del partido',
        },
        {
          dimension: 'league_type',
          value: payload.leagueType,
          description: `Tipo de liga: ${payload.leagueType}`,
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

      // Add creator as league member
      await this.addUserToLeague(leagueId, payload.createdBy);

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
              // TODO: Send email with magic link and custom message
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
        return { matchId, isLocked: false };
      }

      // Get match start time
      const { data: match, error: matchError } = await client
        .from('MATCH')
        .select('start_time')
        .eq('match_id', matchId)
        .maybeSingle();

      if (matchError || !match) {
        return { matchId, isLocked: false };
      }

      const startTime = new Date(match.start_time);
      const now = new Date();
      const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60);

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
          timeUntilStart: Math.max(0, minutesUntilStart),
          lockReason: lock.lock_reason,
        };
      }

      // Auto-lock if within 15 minutes
      if (minutesUntilStart <= 15 && minutesUntilStart > 0) {
        await this.lockPredictions(matchId, 'auto_15min');
        return {
          matchId,
          isLocked: true,
          timeUntilStart: minutesUntilStart,
          lockReason: 'auto_15min',
        };
      }

      return {
        matchId,
        isLocked: minutesUntilStart <= 0,
        timeUntilStart: Math.max(0, minutesUntilStart),
      };
    } catch (error) {
      console.error('Error checking prediction lock:', error);
      return { matchId, isLocked: false };
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
          const userIds = leagueMembers.map((m) => m.user_id);
          await this.notificationService.sendBulkNotifications(
            leagues.league_id,
            userIds,
            {
              leagueId: leagues.league_id,
              matchId,
              type: 'prediction_locked',
              title: '🔒 Predicciones bloqueadas',
              body: 'Las predicciones se cerraron 15 minutos antes del partido',
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
}
