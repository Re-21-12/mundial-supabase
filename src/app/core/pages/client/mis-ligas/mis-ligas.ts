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
import { ButtonModule } from 'primeng/button';
import {
  ClientCardComponent,
  ClientCardData,
} from '../../../../shared/components/client-card/client-card';
import { CreateLeagueDialogComponent } from '../../../../shared/components/create-league-dialog/create-league-dialog';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { NotificationService } from '../../../../shared/services/notification-service';
import { ClientContentService } from '../../../services/client-content.service';
import { SimulateMatchService } from '../../../services/simulate-match.service';
import { SupabaseService } from '../../../services/supabase-service';


@Component({
  selector: 'app-mis-ligas',
  standalone: true,
  imports: [ClientCardComponent, ButtonModule, CreateLeagueDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-ligas.html',
  styleUrls: ['./mis-ligas.css'],
})
export class MisLigasPage implements OnInit, OnDestroy {
  private readonly db = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthFacade);
  private readonly notif = inject(NotificationService);
  private readonly clientContent = inject(ClientContentService);
  private readonly simulateSvc = inject(SimulateMatchService);
  private readonly simulatingLeague = signal<number | null>(null);

  private channel: RealtimeChannel | null = null;

  protected readonly cards = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);
  protected readonly showCreateDialog = signal(false);

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
              {
                key: 'chat',
                label: 'Chat',
                icon: 'pi-comments',
                variant: 'primary' as const,
                disabled: r.status === 'finished',
              },
              {
                key: 'league',
                label: 'Ver liga',
                icon: 'pi-arrow-right',
                variant: 'ghost' as const,
              },
              {
                key: 'rules',
                label: 'Reglas',
                icon: 'pi-info-circle',
                variant: 'ghost' as const,
                disabled: r.status === 'finished',
              },
              ...(this.isAdmin()
                ? [
                    {
                      key: 'simulate',
                      label:
                        this.simulatingLeague() === r.league_id ? 'Simulando…' : 'Simular partido',
                      icon: 'pi-bolt',
                      variant: 'secondary' as const,
                      disabled: r.status === 'finished',
                    },
                  ]
                : []),
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
    this.showCreateDialog.set(true);
  }

  protected async onLeagueCreated(_leagueId: number): Promise<void> {
    this.showCreateDialog.set(false);
    await this.load();
  }

  protected readonly isAdmin = () => (this.auth.role() ?? '').toLowerCase() === 'admin';

  protected onAction({ card, key }: { card: ClientCardData; key: string }) {
    if (key === 'chat') {
      this.router.navigate(['/league', card.id, 'chat']);
    } else if (key === 'simulate') {
      void this.onSimulate(Number(card.id));
    } else if (key === 'rules') {
      this.router.navigate(['/league', card.id, 'rules']);
    } else {
      this.router.navigate(['/league', card.id, 'standings']);
    }
  }

  private async onSimulate(leagueId: number): Promise<void> {
    if (this.simulatingLeague() !== null) return;
    this.simulatingLeague.set(leagueId);
    await this.load(); // refresh label

    const result = await this.simulateSvc.simulateNextMatch(leagueId);
    this.simulatingLeague.set(null);

    if (result.success) {
      this.notif.notify('success', 'Partido simulado', result.summary ?? '');
      await this.load();
    } else {
      this.notif.notify('warn', 'Sin partidos', result.error ?? 'No hay partidos pendientes.');
    }
  }
}
