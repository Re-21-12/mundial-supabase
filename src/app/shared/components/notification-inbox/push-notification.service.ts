import { Injectable, inject } from '@angular/core';
import { NotificationInboxService } from './notification-inbox.service';

export type NotificationType =
  | 'match_reminder'
  | 'league_update'
  | 'prediction_locked'
  | 'result_posted'
  | 'invitation_received'
  | 'invitation_accepted'
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
  private notificationInboxService = inject(NotificationInboxService);

  /**
   * Compatibility no-op kept for callers that still try to register push subscriptions.
   */
  async registerPushSubscription(
    userId: number,
    subscription: PushSubscriptionPayload,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; error?: string }> {
    void userId;
    void subscription;
    void userAgent;
    void ipAddress;

    return { success: true };
  }

  /**
   * Compatibility no-op kept for callers that still try to unregister push subscriptions.
   */
  async unregisterPushSubscription(
    endpoint: string,
  ): Promise<{ success: boolean; error?: string }> {
    void endpoint;
    return { success: true };
  }

  /**
   * Delegates to the in-app inbox service.
   */
  async sendPushNotification(
    payload: PushNotificationPayload,
    createdBy: number,
  ): Promise<{ success: boolean; notificationId?: number; error?: string }> {
    const result = await this.notificationInboxService.sendNotification(
      {
        userId: payload.userId,
        leagueId: payload.leagueId,
        matchId: payload.matchId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
      createdBy,
    );

    return {
      success: result.success,
      notificationId: result.notificationId,
      error: result.error,
    };
  }

  /**
   * Delegates bulk sends to the in-app inbox service.
   */
  async sendBulkNotifications(
    leagueId: number,
    userIds: number[],
    notification: Omit<PushNotificationPayload, 'userId'>,
    createdBy: number,
  ): Promise<{ success: boolean; sentCount: number; failedCount: number; error?: string }> {
    const result = await this.notificationInboxService.sendBulkNotifications(
      leagueId,
      userIds,
      notification,
      createdBy,
    );

    return {
      success: result.success,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      error: result.error,
    };
  }

  /**
   * Returns in-app notification history for compatibility.
   */
  async getUserNotificationHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    return this.notificationInboxService.getUserNotifications(userId, limit);
  }

  /**
   * Compatibility no-op. Delivery state is tracked in the inbox table instead.
   */
  async updateNotificationStatus(
    notificationId: number,
    status: 'sent' | 'failed',
    errorMessage?: string,
  ): Promise<{ success: boolean; error?: string }> {
    void notificationId;
    void status;
    void errorMessage;
    return { success: true };
  }

  /**
   * Subscriptions are browser-native now, so there is no persisted subscription list.
   */
  async getUserSubscriptions(userId: number): Promise<any[]> {
    void userId;
    return [];
  }

  async sendMatchReminderNotifications(
    matchId: number,
    leagueId: number,
    teamsInfo: string,
    createdBy: number,
    userIds: number[],
  ): Promise<{ success: boolean; sentCount: number; error?: string }> {
    return this.notificationInboxService.sendMatchReminderNotification(
      matchId,
      leagueId,
      teamsInfo,
      createdBy,
      userIds,
    );
  }

  async sendPredictionLockedNotification(
    matchId: number,
    leagueId: number,
    teamsInfo: string,
    createdBy: number,
    userIds: number[],
  ): Promise<{ success: boolean; sentCount: number; error?: string }> {
    return this.notificationInboxService.sendPredictionLockedNotification(
      matchId,
      leagueId,
      teamsInfo,
      createdBy,
      userIds,
    );
  }
}
