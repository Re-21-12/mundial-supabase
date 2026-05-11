import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type NotificationType =
  | 'match_reminder'
  | 'league_update'
  | 'prediction_locked'
  | 'result_posted'
  | 'invitation_received'
  | 'league_created';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
  userId: number;
  leagueId?: number;
  matchId?: number;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
}

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationInboxService {
  private supabaseService = inject(SupabaseService);
  private serviceWorkerReady = false;

  /**
   * Inicializa el servicio de notificaciones
   */
  async initialize(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications API no soportada en este navegador');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers no soportados en este navegador');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/assets/notification-sw.js');
      this.serviceWorkerReady = true;

      // Pedir permiso si no lo tiene
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      return Notification.permission === 'granted';
    } catch (error) {
      console.error('Error inicializando service worker:', error);
      return false;
    }
  }

  /**
   * Crea una notificación en la bandeja de la app (NOTIFICATION_INBOX)
   */
  async createInboxNotification(
    payload: NotificationPayload,
    createdBy: number,
  ): Promise<{ success: boolean; notificationId?: number; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { data, error } = await client
        .from('NOTIFICATION_INBOX')
        .insert({
          user_id: payload.userId,
          league_id: payload.leagueId || null,
          match_id: payload.matchId || null,
          notification_type: payload.type,
          title: payload.title,
          body: payload.body,
          icon: payload.icon || null,
          action_url: payload.actionUrl || null,
          payload: payload.data || {},
          priority: payload.priority || 'normal',
          is_read: false,
          browser_notification_sent: false,
          created_by: createdBy,
          created_at: new Date().toISOString(),
        } as any)
        .select();

      if (error) {
        console.error('Error creando notificación en inbox:', error);
        return { success: false, error: error.message };
      }

      const notificationId = data?.[0]?.notification_id;
      return { success: true, notificationId };
    } catch (error) {
      console.error('Error in createInboxNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía una notificación del navegador usando Notifications API
   */
  async sendBrowserNotification(
    notificationId: number,
    userId: number,
    options: BrowserNotificationOptions,
    createdBy: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!('Notification' in window)) {
        return { success: false, error: 'Browser Notifications no soportadas' };
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notificaciones del navegador no permitidas por el usuario');
        return { success: false, error: 'Notificaciones no permitidas' };
      }

      // Enviar notificación
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/assets/icons/notification-icon.png',
        badge: options.badge || '/assets/icons/notification-badge.png',
        tag: options.tag || 'mondial-notification',
        requireInteraction: options.requireInteraction !== false && options.body.length > 100,
        data: options.data || {},
      });

      // Registrar en log
      await this.logBrowserNotification(
        notificationId,
        userId,
        options.title,
        options.body,
        options.icon,
        options.badge,
        true,
        createdBy,
      );

      // Marcar como enviada
      await this.markBrowserNotificationSent(notificationId, createdBy);

      // Click handler
      notification.onclick = () => {
        window.focus();
        if (options.data?.actionUrl) {
          window.location.hash = options.data.actionUrl;
        }
        notification.close();
      };

      return { success: true };
    } catch (error) {
      console.error('Error enviando notificación del navegador:', error);

      // Registrar fallo
      await this.logBrowserNotification(
        notificationId,
        userId,
        options.title,
        options.body,
        options.icon,
        options.badge,
        false,
        createdBy,
        error instanceof Error ? error.message : 'Unknown error',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía una notificación completa: inbox + browser notification
   */
  async sendNotification(
    payload: NotificationPayload,
    createdBy: number,
  ): Promise<{ success: boolean; notificationId?: number; error?: string }> {
    try {
      // 1. Crear en inbox
      const inboxResult = await this.createInboxNotification(payload, createdBy);
      if (!inboxResult.success || !inboxResult.notificationId) {
        return { success: false, error: inboxResult.error };
      }

      // 2. Enviar notificación del navegador (asincróna, no bloquea)
      if (Notification.permission === 'granted' && this.serviceWorkerReady) {
        this.sendBrowserNotification(
          inboxResult.notificationId,
          payload.userId,
          {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            tag: `notif-${payload.type}`,
            data: { ...payload.data, notificationId: inboxResult.notificationId },
          },
          createdBy,
        ).catch((err) => console.error('Error enviando browser notification:', err));
      }

      return {
        success: true,
        notificationId: inboxResult.notificationId,
      };
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía notificaciones en bulk
   */
  async sendBulkNotifications(
    leagueId: number,
    userIds: number[],
    notification: Omit<NotificationPayload, 'userId'>,
    createdBy: number,
  ): Promise<{ success: boolean; sentCount: number; failedCount: number; error?: string }> {
    let sentCount = 0;
    let failedCount = 0;

    try {
      for (const userId of userIds) {
        const result = await this.sendNotification({ ...notification, userId }, createdBy);

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
   * Obtiene notificaciones del usuario
   */
  async getUserNotifications(
    userId: number,
    limit: number = 50,
    unreadOnly = false,
  ): Promise<any[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return [];

      let query = client
        .from('NOTIFICATION_INBOX')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

      if (error) {
        console.error('Error fetching user notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  /**
   * Marca como leída
   */
  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { error } = await client
        .from('NOTIFICATION_INBOX')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        } as any)
        .eq('notification_id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Marca todas como leídas
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { error } = await client
        .from('NOTIFICATION_INBOX')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        } as any)
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Conteo de sin leer
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return 0;

      const { count, error } = await client
        .from('NOTIFICATION_INBOX')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Elimina notificación (soft delete)
   */
  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      const { error } = await client
        .from('NOTIFICATION_INBOX')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        } as any)
        .eq('notification_id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Registra envío de browser notification
   */
  private async logBrowserNotification(
    notificationId: number,
    userId: number,
    browserTitle: string,
    browserBody: string,
    icon: string | undefined,
    badge: string | undefined,
    success: boolean,
    createdBy: number,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return;

      await client.from('BROWSER_NOTIFICATION_LOG').insert({
        notification_id: notificationId,
        user_id: userId,
        browser_title: browserTitle,
        browser_body: browserBody,
        browser_icon: icon || null,
        browser_badge: badge || null,
        browser_tag: `notif-${notificationId}`,
        sent_at: new Date().toISOString(),
        success,
        error_message: errorMessage || null,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      } as any);
    } catch (error) {
      console.error('Error logging browser notification:', error);
    }
  }

  /**
   * Marca como enviada
   */
  private async markBrowserNotificationSent(
    notificationId: number,
    createdBy: number,
  ): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return;

      await client
        .from('NOTIFICATION_INBOX')
        .update({
          browser_notification_sent: true,
          browser_notification_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: createdBy,
        } as any)
        .eq('notification_id', notificationId);
    } catch (error) {
      console.error('Error marking browser notification as sent:', error);
    }
  }

  /**
   * Recordatorio de partido
   */
  async sendMatchReminderNotification(
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
        icon: '/assets/icons/match-icon.png',
        actionUrl: `/league/${leagueId}/predictions`,
        priority: 'high',
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
   * Predicciones bloqueadas
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
        icon: '/assets/icons/lock-icon.png',
        actionUrl: `/league/${leagueId}/standings`,
        priority: 'normal',
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
