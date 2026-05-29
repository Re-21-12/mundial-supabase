import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { NotificationService } from '../../../shared/services/notification-service';
import { ButtonModule } from 'primeng/button';
import { ClientContentService } from '../../services/client-content.service';
import {
  ClientCardComponent,
  type ClientCardData,
} from '../../../shared/components/client-card/client-card';

interface LeagueRow {
  league_id: number;
  name: string;
  status: string | null;
  logo_url: string | null;
  invitation_code: string | null;
  buy_in_amount: number;
  catalog: { description: string } | null;
  user_league: { accumulated_points: number }[] | null;
}

@Component({
  selector: 'app-mis-ligas',
  standalone: true,
  imports: [ClientCardComponent, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ml-page">
      <div class="ml-header">
        <div class="ml-header__title">
          <h2 class="ml-title">
            <i class="pi pi-trophy"></i>
            Mis Ligas
          </h2>
          <p class="ml-subtitle">Crea una liga nueva o revisa las ligas a las que ya perteneces.</p>
        </div>
        <div class="ml-actions">
          <p-button
            label="Crear liga nueva"
            icon="pi pi-plus"
            severity="primary"
            (click)="createLeague()"
          />
        </div>
      </div>

      @if (loading()) {
        <div class="ml-grid">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="ml-skeleton"></div>
          }
        </div>
      } @else if (cards().length === 0) {
        <div class="ml-empty">
          <i class="pi pi-trophy"></i>
          <p>No perteneces a ninguna liga aún.</p>
        </div>
      } @else {
        <div class="ml-grid">
          @for (card of cards(); track card.id) {
            <app-client-card [card]="card" (action)="onAction($event)" />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ml-page {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .ml-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .ml-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .ml-header__title {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .ml-title {
        font-size: 1.25rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
      }
      .ml-subtitle {
        margin: 0;
        color: var(--muted-foreground);
        font-size: 0.9rem;
      }
      .ml-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.25rem;
      }
      .ml-skeleton {
        height: 220px;
        border-radius: 20px;
        background: var(--card);
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.45;
        }
      }
      .ml-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 200px;
        color: var(--muted-foreground);
        font-size: 0.95rem;
      }
      .ml-empty .pi {
        font-size: 2rem;
      }
    `,
  ],
})
export class MisLigasPage implements OnInit, OnDestroy {
  private readonly db = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthFacade);
  private readonly notif = inject(NotificationService);
  private readonly clientContent = inject(ClientContentService);

  private channel: RealtimeChannel | null = null;

  protected readonly cards = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit() {
    await this.load();
    this.subscribeLeagueFinished();
  }

  ngOnDestroy() {
    if (this.channel) this.db.client.removeChannel(this.channel);
  }

  private subscribeLeagueFinished() {
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) return;

    this.channel = this.db.client
      .channel(`league-finished-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'NOTIFICATION_INBOX',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.notification_type !== 'league_finished') return;
          this.notif.notify('success', row.title, row.body);
          void this.load();
        },
      )
      .subscribe();
  }

  private async load() {
    this.loading.set(true);
    try {
      const rows = await this.clientContent.loadLeagues();

      this.cards.set(
        rows.map((r): ClientCardData => {
          const pts = r.user_league?.[0]?.accumulated_points ?? 0;
          const tagType =
            r.status === 'active'
              ? 'success'
              : r.status === 'inactive'
                ? 'warning'
                : r.status === 'finished'
                  ? 'danger'
                  : 'default';

          return {
            id: r.league_id,
            imageUrl: r.logo_url,
            title: r.name,
            subtitle: r.catalog?.description ?? null,
            tag: { label: r.status ?? 'Sin estado', type: tagType },
            metric: { value: pts, label: 'pts' },
            details: [{ icon: 'pi-wallet', text: `Buy-in: $${r.buy_in_amount}` }],
            actions: [
              { key: 'chat', label: 'Chat', icon: 'pi-comments', variant: 'primary' as const },
              {
                key: 'league',
                label: 'Ver liga',
                icon: 'pi-arrow-right',
                variant: 'ghost' as const,
              },
            ],
            expandable: r.invitation_code
              ? {
                  triggerLabel: 'Código de invitación',
                  content: r.invitation_code,
                  copyable: true,
                }
              : undefined,
          };
        }),
      );
    } catch (error) {
      console.error('[MisLigas] load error:', error);
      this.loading.set(false);
    }
    this.loading.set(false);
  }

  protected createLeague(): void {
    void this.router.navigate(['/league']);
  }

  protected onAction({ card, key }: { card: ClientCardData; key: string }) {
    if (key === 'chat') {
      this.router.navigate(['/league', card.id, 'chat']);
    } else {
      this.router.navigate(['/league', card.id, 'standings']);
    }
  }
}
