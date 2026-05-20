import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../../../core/services/supabase-service';
import { DynamicService } from '../../../../core/services/dynamic-service';
import type { Database } from '../../../../types/database.types';

type UserLeagueRow = Database['public']['Tables']['USER_LEAGUE']['Row'];

@Injectable()
export class UserLeagueRealtimeService implements OnDestroy {
  private readonly supabaseService = inject(SupabaseService);
  private readonly dynamicService = inject(DynamicService);

  private channel: RealtimeChannel | null = null;

  readonly userLeagues = signal<UserLeagueRow[]>([]);
  readonly loading = signal(true);

  async connect(pageSize: number, page: number): Promise<void> {
    await this.loadInitialData(pageSize, page);
    this.openChannel();
  }

  private async loadInitialData(pageSize: number, page: number): Promise<void> {
    this.loading.set(true);
    const res = await this.dynamicService.fetchData<UserLeagueRow>({
      table: 'USER_LEAGUE',
      order: 'asc',
      limit: pageSize,
      page,
      columns: '*',
    });
    if (Array.isArray(res)) this.userLeagues.set(res);
    this.loading.set(false);
  }

  private openChannel(): void {
    this.channel = this.supabaseService.client
      .channel('user-league-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'USER_LEAGUE' },
        (payload) => this.handleChange(payload),
      )
      .subscribe();
  }

  private handleChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as UserLeagueRow;
    const removed = payload.old as Partial<UserLeagueRow>;

    this.userLeagues.update((current) => {
      if (payload.eventType === 'INSERT') {
        return [...current, incoming];
      }
      if (payload.eventType === 'UPDATE') {
        return current.map((r) =>
          r.user_league_id === incoming.user_league_id ? incoming : r,
        );
      }
      if (payload.eventType === 'DELETE') {
        return current.filter((r) => r.user_league_id !== removed.user_league_id);
      }
      return current;
    });
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
