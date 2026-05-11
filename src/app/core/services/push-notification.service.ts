import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type NotificationType =
  | 'match_reminder'
  | 'league_update'
  | 'prediction_locked'
  | 'result_posted'
  | 'invitation_received'
  | 'league_created';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface PushNotificationPayload {
  userId: number;
  leagueId?: number;
  matchId?: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private supabaseService = inject(SupabaseService);

  /**
   * Registers a browser push subscription for a user
   */
  async registerPushSubscription(
    userId: number,
    subscription: PushSubscriptionPayload,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { error } = await client
        .from('PUSH_SUBSCRIPTION')
        .insert({
          user_id: userId,
          endpoint: subscription.endpoint,
          auth_key: subscription.keys.auth,
          p256dh_key: subscription.keys.p256dh,
          user_agent: userAgent || null,
          ip_address: ipAddress || null,
          status: 'active',
          created_at: new Date().toISOString(),
          created_by: userId,
        } as any)
        .select();

      if (error) {
        console.error('Error registering push subscription:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Push subscription registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unregisters a push subscription
   */
  async unregisterPushSubscription(
    endpoint: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { error } = await client
        .from('PUSH_SUBSCRIPTION')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('endpoint', endpoint);

      if (error) {
        console.error('Error unregistering push subscription:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Push subscription unregistration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends a push notification to a user
   * Note: Actual push delivery would require backend/service worker implementation
   */
  async sendPushNotification(
    payload: PushNotificationPayload,
    createdBy: number,
  ): Promise<{ success: boolean; notificationId?: number; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      // Log the notification in database
      const { data, error } = await client
        .from('PUSH_NOTIFICATION')
        .insert({
          user_id: payload.userId,
          league_id: payload.leagueId || null,
          match_id: payload.matchId || null,
          notification_type: payload.type,
          title: payload.title,
          body: payload.body,
          payload: payload.data || {},
          delivery_status: 'pending',
          sent_at: new Date().toISOString(),
          created_by: createdBy,
          created_at: new Date().toISOString(),
        } as any)
        .select();

      if (error) {
        console.error('Error logging push notification:', error);
        return { success: false, error: error.message };
      }

      // In production, you would:
      // 1. Get user's active push subscriptions
      // 2. Use web-push library to send to each endpoint
      // 3. Update delivery_status based on response

      return {
        success: true,
        notificationId: data?.[0]?.push_notification_id,
      };
    } catch (error) {
      console.error('Push notification send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends bulk notifications to league members
   */
  async sendBulkNotifications(
    leagueId: number,
    userIds: number[],
    notification: Omit<PushNotificationPayload, 'userId'>,
    createdBy: number,
  ): Promise<{ success: boolean; sentCount: number; failedCount: number; error?: string }> {
    let sentCount = 0;
    let failedCount = 0;

    try {
      for (const userId of userIds) {
        const result = await this.sendPushNotification(
          {
            ...notification,
            userId,
          },
          createdBy,
        );

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }

      return { success: sentCount > 0, sentCount, failedCount };
    } catch (error) {
      console.error('Bulk notification send error:', error);
      return {
        success: false,
        sentCount,
        failedCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets notification history for a user
   */
  async getUserNotificationHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return [];

      const { data, error } = await client
        .from('PUSH_NOTIFICATION')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching notification history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotificationHistory:', error);
      return [];
    }
  }

  /**
   * Updates notification delivery status
   */
  async updateNotificationStatus(
    notificationId: number,
    status: 'sent' | 'failed',
    errorMessage?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const updateData: any = {
        delivery_status: status,
        updated_at: new Date().toISOString(),
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await client
        .from('PUSH_NOTIFICATION')
        .update(updateData)
        .eq('push_notification_id', notificationId);

      if (error) {
        console.error('Error updating notification status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateNotificationStatus:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets user's active push subscriptions
   */
  async getUserSubscriptions(userId: number): Promise<any[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return [];

      const { data, error } = await client
        .from('PUSH_SUBSCRIPTION')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_deleted', false);

      if (error) {
        console.error('Error fetching user subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSubscriptions:', error);
      return [];
    }
  }

  /**
   * Sends match reminder notifications 15 minutes before match start
   */
  async sendMatchReminderNotifications(
    matchId: number,
    leagueId: number,
    teamsInfo: string,
    createdBy: number,
    userIds: number[],
  ): Promise<{ success: boolean; sentCount: number; error?: string }> {
    const result = await this.sendBulkNotifications(
      leagueId,
      userIds,
      {
        leagueId,
        matchId,
        type: 'match_reminder',
        title: '⚽ Partido por comenzar',
        body: `${teamsInfo} en 15 minutos. ¡Haz tu predicción!`,
        data: { matchId, leagueId, action: 'view_predictions' },
      },
      createdBy,
    );

    return {
      success: result.success,
      sentCount: result.sentCount,
      error: result.error,
    };
  }

  /**
   * Sends prediction lock notification
   */
  async sendPredictionLockedNotification(
    matchId: number,
    leagueId: number,
    teamsInfo: string,
    createdBy: number,
    userIds: number[],
  ): Promise<{ success: boolean; sentCount: number; error?: string }> {
    const result = await this.sendBulkNotifications(
      leagueId,
      userIds,
      {
        leagueId,
        matchId,
        type: 'prediction_locked',
        title: '🔒 Predicciones cerradas',
        body: `Las predicciones para ${teamsInfo} han sido bloqueadas`,
        data: { matchId, leagueId, action: 'view_league' },
      },
      createdBy,
    );

    return {
      success: result.success,
      sentCount: result.sentCount,
      error: result.error,
    };
  }
}
