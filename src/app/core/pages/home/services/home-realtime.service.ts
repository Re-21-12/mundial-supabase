import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../../services/supabase-service';
import { DynamicService } from '../../../services/dynamic-service';
import { PostgrestError } from '@supabase/supabase-js';
import type { MatchRow, MatchPeriodRow, UserLeagueRow } from '../models/home.models';

@Injectable()
export class HomeRealtimeService implements OnDestroy {
  private readonly supabaseService = inject(SupabaseService);
  private readonly dynamicService = inject(DynamicService);

  private channel: RealtimeChannel | null = null;

  readonly matches = signal<MatchRow[]>([]);
  readonly periods = signal<MatchPeriodRow[]>([]);
  readonly userLeagues = signal<UserLeagueRow[]>([]);

  async connect(): Promise<void> {
    await this.loadInitialData();
    this.openChannel();
  }

  private async loadInitialData(): Promise<void> {
    const [matchRes, periodRes] = await Promise.all([
      this.dynamicService.fetchData<MatchRow>({
        table: 'MATCH',
        order: 'asc',
        limit: 20,
        page: 0,
        columns: '*',
      }),
      this.dynamicService.fetchData<MatchPeriodRow>({
        table: 'MATCH_PERIOD',
        order: 'asc',
        limit: 50,
        page: 0,
        columns: '*',
      }),
    ]);

    if (!(matchRes instanceof PostgrestError)) {
      this.matches.set(matchRes);
    }
    if (!(periodRes instanceof PostgrestError)) {
      this.periods.set(periodRes);
    }
  }

  private openChannel(): void {
    this.channel = this.supabaseService.client
      .channel('home-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'MATCH' },
        (payload) => this.handleMatchChange(payload),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'MATCH_PERIOD' },
        (payload) => this.handlePeriodChange(payload),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'USER_LEAGUE' },
        (payload) => this.handleUserLeagueChange(payload),
      )
      .subscribe();
  }

  private handleMatchChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as MatchRow;
    const removed = payload.old as Partial<MatchRow>;

    this.matches.update((current) => {
      if (payload.eventType === 'INSERT') {
        return [...current, incoming];
      }
      if (payload.eventType === 'UPDATE') {
        return current.map((m) => (m.match_id === incoming.match_id ? incoming : m));
      }
      if (payload.eventType === 'DELETE') {
        return current.filter((m) => m.match_id !== removed.match_id);
      }
      return current;
    });
  }

  private handlePeriodChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as MatchPeriodRow;
    const removed = payload.old as Partial<MatchPeriodRow>;

    this.periods.update((current) => {
      if (payload.eventType === 'INSERT') {
        return [...current, incoming];
      }
      if (payload.eventType === 'UPDATE') {
        return current.map((p) => (p.period_id === incoming.period_id ? incoming : p));
      }
      if (payload.eventType === 'DELETE') {
        return current.filter((p) => p.period_id !== removed.period_id);
      }
      return current;
    });
  }

  private handleUserLeagueChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as UserLeagueRow;
    const removed = payload.old as Partial<UserLeagueRow>;

    this.userLeagues.update((current) => {
      if (payload.eventType === 'INSERT') {
        return [...current, incoming];
      }
      if (payload.eventType === 'UPDATE') {
        return current.map((ul) =>
          ul.user_league_id === incoming.user_league_id ? incoming : ul,
        );
      }
      if (payload.eventType === 'DELETE') {
        return current.filter((ul) => ul.user_league_id !== removed.user_league_id);
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
