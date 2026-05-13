import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationInboxService } from '../../../core/services/notification-inbox.service';
import { AuthFacade } from '../../features/auth/auth.facade';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notification-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-inbox">
      <!-- Header con contador -->
      <div class="inbox-header">
        <h3 class="inbox-title">📬 Notificaciones</h3>
        <div class="inbox-actions">
          @if (unreadCount() > 0) {
            <button
              class="btn-mark-read"
              (click)="markAllAsRead()"
              title="Marcar todas como leídas"
            >
              ✓ Todas leídas
            </button>
          }
          <span class="unread-badge">{{ unreadCount() }}</span>
        </div>
      </div>

      <!-- Lista de notificaciones -->
      <div class="notifications-list">
        @if (notifications().length === 0) {
          <div class="empty-state">
            <p>No tienes notificaciones</p>
          </div>
        } @else {
          @for (notif of notifications(); track notif.notification_id) {
            <div
              class="notification-item"
              [class.unread]="!notif.is_read"
              [class.priority-urgent]="notif.priority === 'urgent'"
              [class.priority-high]="notif.priority === 'high'"
            >
              <!-- Icon -->
              @if (notif.icon) {
                <img [src]="notif.icon" alt="icon" class="notif-icon" />
              } @else {
                <span class="notif-icon-placeholder">
                  {{ getIconForType(notif.notification_type) }}
                </span>
              }

              <!-- Content -->
              <div class="notif-content" (click)="handleNotificationClick(notif)">
                <h4 class="notif-title">{{ notif.title }}</h4>
                <p class="notif-body">{{ notif.body }}</p>
                <span class="notif-time">{{ formatTime(notif.created_at) }}</span>
              </div>

              <!-- Actions -->
              <div class="notif-actions">
                @if (!notif.is_read) {
                  <button
                    class="btn-read"
                    (click)="toggleRead(notif.notification_id)"
                    title="Marcar como leída"
                  >
                    ●
                  </button>
                }
                <button
                  class="btn-delete"
                  (click)="deleteNotification(notif.notification_id)"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .notification-inbox {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        max-height: 500px;
        display: flex;
        flex-direction: column;
      }

      .inbox-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .inbox-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .inbox-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .btn-mark-read {
        padding: 4px 8px;
        font-size: 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-mark-read:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .unread-badge {
        display: inline-block;
        background: #ef4444;
        color: white;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
        min-width: 24px;
        text-align: center;
      }

      .notifications-list {
        flex: 1;
        overflow-y: auto;
      }

      .empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        color: #9ca3af;
        font-size: 14px;
      }

      .notification-item {
        display: flex;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        background: white;
        transition: background 0.2s;
        cursor: pointer;
      }

      .notification-item:hover {
        background: #f9fafb;
      }

      .notification-item.unread {
        background: #f0f9ff;
        border-left: 3px solid #3b82f6;
      }

      .notification-item.unread:hover {
        background: #e0f2fe;
      }

      .notification-item.priority-urgent {
        background: #fef2f2;
        border-left-color: #ef4444;
      }

      .notification-item.priority-high {
        background: #fffbeb;
        border-left-color: #f59e0b;
      }

      .notif-icon {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .notif-icon-placeholder {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e5e7eb;
        border-radius: 4px;
        font-size: 16px;
        flex-shrink: 0;
      }

      .notif-content {
        flex: 1;
        min-width: 0;
      }

      .notif-title {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }

      .notif-body {
        margin: 0 0 4px 0;
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
        white-space: normal;
        word-break: break-word;
      }

      .notif-time {
        font-size: 11px;
        color: #9ca3af;
      }

      .notif-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .btn-read,
      .btn-delete {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 4px;
        background: #f3f4f6;
        color: #6b7280;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-read:hover {
        background: #e5e7eb;
        color: #1f2937;
      }

      .btn-delete:hover {
        background: #fecaca;
        color: #dc2626;
      }

      @media (max-width: 640px) {
        .notification-inbox {
          max-height: 400px;
        }

        .inbox-actions {
          flex-direction: column;
          gap: 4px;
        }

        .notification-item {
          gap: 8px;
          padding: 10px 12px;
        }

        .notif-title {
          font-size: 13px;
        }

        .notif-body {
          font-size: 12px;
        }
      }
    `,
  ],
})
export class NotificationInboxComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationInboxService);
  private authFacade = inject(AuthFacade);
  private destroy$ = new Subject<void>();
  private get userId(): number { return Number(this.authFacade.getInternalUserId()) || 0; }

  notifications = signal<any[]>([]);
  unreadCount = signal(0);

  ngOnInit() {
    this.loadNotifications();
    // Cargar cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  getIconForType(type: string): string {
    const icons: Record<string, string> = {
      match_reminder: '⚽',
      prediction_locked: '🔒',
      result_posted: '📊',
      league_update: '📢',
      invitation_received: '📧',
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
