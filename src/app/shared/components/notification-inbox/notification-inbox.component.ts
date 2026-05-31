import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationInboxService } from './notification-inbox.service';
import { InvitationService } from './invitation.service';
import { AuthFacade } from '../../features/auth/auth.facade';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-notification-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-inbox.component.html',
  styleUrls: ['./notification-inbox.component.css'],
})
export class NotificationInboxComponent implements OnInit {
  private notificationService = inject(NotificationInboxService);
  private invitationService = inject(InvitationService);
  private authFacade = inject(AuthFacade);
  private destroyRef = inject(DestroyRef);
  private get userId(): number {
    return Number(this.authFacade.getInternalUserId()) || 0;
  }

  notifications = signal<any[]>([]);
  unreadCount = signal(0);
  processingId = signal<number | null>(null);

  ngOnInit() {
    this.loadNotifications();
    // Cargar cada 30 segundos
    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadNotifications());
  }

  private async loadNotifications() {
    const [notifs, count] = await Promise.all([
      this.notificationService.getUserNotifications(this.userId),
      this.notificationService.getUnreadCount(this.userId),
    ]);

    this.notifications.set(notifs);
    this.unreadCount.set(count);
  }

  async toggleRead(notificationId: number) {
    await this.notificationService.markAsRead(notificationId, this.userId);
    await this.loadNotifications();
  }

  async markAllAsRead() {
    await this.notificationService.markAllAsRead(this.userId);
    await this.loadNotifications();
  }

  async deleteNotification(notificationId: number) {
    await this.notificationService.deleteNotification(notificationId, this.userId);
    await this.loadNotifications();
  }

  handleNotificationClick(notif: any) {
    if (!notif.is_read) {
      this.toggleRead(notif.notification_id);
    }

    if (notif.action_url) {
      window.location.hash = notif.action_url;
    }
  }

  async approveParticipant(notif: any) {
    const userLeagueId = notif.payload?.['userLeagueId'];
    if (!userLeagueId) return;
    this.processingId.set(notif.notification_id);
    const result = await this.invitationService.approveParticipant(userLeagueId, this.userId);
    if (result.success) {
      await this.notificationService.deleteNotification(notif.notification_id, this.userId);
    }
    this.processingId.set(null);
    await this.loadNotifications();
  }

  async rejectParticipant(notif: any) {
    const userLeagueId = notif.payload?.['userLeagueId'];
    if (!userLeagueId) return;
    this.processingId.set(notif.notification_id);
    const result = await this.invitationService.rejectParticipant(userLeagueId, this.userId);
    if (result.success) {
      await this.notificationService.deleteNotification(notif.notification_id, this.userId);
    }
    this.processingId.set(null);
    await this.loadNotifications();
  }

  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      match_reminder: '⚽',
      prediction_locked: '🔒',
      result_posted: '📊',
      league_update: '📢',
      invitation_received: '📧',
      invitation_accepted: '✅',
      participant_approval: '👤',
      league_created: '🏆',
    };
    return icons[type] || '📬';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return date.toLocaleDateString('es-ES');
  }
}
