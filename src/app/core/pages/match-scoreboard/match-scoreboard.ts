import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase-service';
import { DynamicService } from '../../services/dynamic-service';
import type { Database } from '../../../types/database.types';

type MatchRow = Database['public']['Tables']['MATCH']['Row'];
type PeriodRow = Database['public']['Tables']['MATCH_PERIOD']['Row'];
type LeagueRow = Database['public']['Tables']['LEAGUE']['Row'];
type CatalogRow = Database['public']['Tables']['CATALOG']['Row'];

interface PeriodEdit {
  periodId: number | null;
  matchId: number;
  catalogId: number;
  home: number;
  away: number;
  saving: boolean;
}

@Component({
  selector: 'app-match-scoreboard',
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule],
  templateUrl: './match-scoreboard.html',
  styleUrl: './match-scoreboard.css',
})
export class MatchScoreboardPage implements OnInit, OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly dynamicService = inject(DynamicService);
  private channel: RealtimeChannel | null = null;

  // ── Filter state ──────────────────────────────────────────────────────────────
  readonly leagues = signal<LeagueRow[]>([]);
  readonly selectedLeagueId = signal<number | null>(null);
  readonly catalogs = signal<CatalogRow[]>([]);

  // ── Data ──────────────────────────────────────────────────────────────────────
  readonly matches = signal<MatchRow[]>([]);
  readonly periodsMap = signal<Map<number, PeriodRow[]>>(new Map());

  // ── UI state ──────────────────────────────────────────────────────────────────
  readonly expandedMatchId = signal<number | null>(null);
  readonly loadingMatches = signal(false);
  readonly loadingPeriods = signal<Set<number>>(new Set());

  // In-flight edits keyed by period_id (null = new period for that match)
  readonly edits = signal<Map<string, PeriodEdit>>(new Map());

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadLeagues(), this.loadCatalogs()]);
  }

  ngOnDestroy(): void {
    this.channel?.unsubscribe();
  }

  // ── Load helpers ──────────────────────────────────────────────────────────────
  private async loadLeagues(): Promise<void> {
    const { data } = await this.supabase.client
      .from('LEAGUE')
      .select('*')
      .eq('is_deleted', false)
      .order('name');
    if (data) this.leagues.set(data as LeagueRow[]);
  }

  private async loadCatalogs(): Promise<void> {
    const { data } = await this.supabase.client
      .from('CATALOG')
      .select('*')
      .eq('is_deleted', false)
      .order('name');
    if (data) this.catalogs.set(data as CatalogRow[]);
  }

  async onLeagueChange(leagueId: number | null): Promise<void> {
    this.selectedLeagueId.set(leagueId);
    this.expandedMatchId.set(null);
    this.periodsMap.set(new Map());
    this.edits.set(new Map());
    this.channel?.unsubscribe();

    if (!leagueId) { this.matches.set([]); return; }

    this.loadingMatches.set(true);
    const { data } = await this.supabase.client
      .from('MATCH')
      .select('*')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .order('start_time');
    if (data) this.matches.set(data as MatchRow[]);
    this.loadingMatches.set(false);

    this.subscribeRealtime(leagueId);
  }

  async toggleMatch(matchId: number): Promise<void> {
    if (this.expandedMatchId() === matchId) {
      this.expandedMatchId.set(null);
      return;
    }
    this.expandedMatchId.set(matchId);
    if (!this.periodsMap().has(matchId)) {
      await this.loadPeriods(matchId);
    }
  }

  private async loadPeriods(matchId: number): Promise<void> {
    this.loadingPeriods.update((s) => new Set([...s, matchId]));
    const { data } = await this.supabase.client
      .from('MATCH_PERIOD')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_deleted', false)
      .order('period_id');

    this.periodsMap.update((m) => {
      const next = new Map(m);
      next.set(matchId, (data ?? []) as PeriodRow[]);
      return next;
    });
    this.loadingPeriods.update((s) => { const n = new Set(s); n.delete(matchId); return n; });
  }

  // ── Realtime ──────────────────────────────────────────────────────────────────
  private subscribeRealtime(leagueId: number): void {
    this.channel = this.supabase.client
      .channel(`scoreboard-league-${leagueId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'MATCH', filter: `league_id=eq.${leagueId}` },
        (payload) => this.handleMatchChange(payload))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'MATCH_PERIOD' },
        (payload) => this.handlePeriodChange(payload))
      .subscribe();
  }

  private handleMatchChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as MatchRow;
    const removed  = payload.old as Partial<MatchRow>;
    this.matches.update((list) => {
      if (payload.eventType === 'INSERT') return [...list, incoming];
      if (payload.eventType === 'UPDATE') return list.map((m) => m.match_id === incoming.match_id ? incoming : m);
      if (payload.eventType === 'DELETE') return list.filter((m) => m.match_id !== removed.match_id);
      return list;
    });
  }

  private handlePeriodChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as PeriodRow;
    const removed  = payload.old as Partial<PeriodRow>;
    const matchId  = incoming?.match_id ?? removed?.match_id;
    if (!matchId) return;

    this.periodsMap.update((m) => {
      if (!m.has(matchId)) return m;
      const next = new Map(m);
      let list = [...(next.get(matchId) ?? [])];
      if (payload.eventType === 'INSERT') list = [...list, incoming];
      if (payload.eventType === 'UPDATE') list = list.map((p) => p.period_id === incoming.period_id ? incoming : p);
      if (payload.eventType === 'DELETE') list = list.filter((p) => p.period_id !== removed.period_id);
      next.set(matchId, list);
      return next;
    });
  }

  // ── Edits ─────────────────────────────────────────────────────────────────────
  editKey(matchId: number, periodId: number | null): string {
    return periodId != null ? `p-${periodId}` : `new-${matchId}`;
  }

  startEditPeriod(period: PeriodRow): void {
    const key = this.editKey(period.match_id, period.period_id);
    this.edits.update((m) => {
      const next = new Map(m);
      next.set(key, {
        periodId: period.period_id,
        matchId: period.match_id,
        catalogId: period.catalog_id,
        home: period.first_team_score ?? 0,
        away: period.second_team_score ?? 0,
        saving: false,
      });
      return next;
    });
  }

  startNewPeriod(matchId: number): void {
    const key = this.editKey(matchId, null);
    const defaultCatalog = this.catalogs()[0]?.catalog_id ?? 1;
    this.edits.update((m) => {
      const next = new Map(m);
      next.set(key, { periodId: null, matchId, catalogId: defaultCatalog, home: 0, away: 0, saving: false });
      return next;
    });
  }

  cancelEdit(key: string): void {
    this.edits.update((m) => { const n = new Map(m); n.delete(key); return n; });
  }

  getEdit(matchId: number, periodId: number | null): PeriodEdit | undefined {
    return this.edits().get(this.editKey(matchId, periodId));
  }

  isEditing(matchId: number, periodId: number | null): boolean {
    return this.edits().has(this.editKey(matchId, periodId));
  }

  async savePeriod(key: string): Promise<void> {
    const edit = this.edits().get(key);
    if (!edit) return;

    this.edits.update((m) => { const n = new Map(m); n.set(key, { ...edit, saving: true }); return n; });

    const payload = {
      match_id: edit.matchId,
      catalog_id: edit.catalogId,
      first_team_score: edit.home,
      second_team_score: edit.away,
    };

    if (edit.periodId != null) {
      await this.dynamicService.updateData('MATCH_PERIOD', payload, {
        field: 'period_id',
        value: String(edit.periodId),
      });
    } else {
      await this.dynamicService.insertData('MATCH_PERIOD', payload);
    }

    this.cancelEdit(key);
    await this.loadPeriods(edit.matchId);
  }

  // ── View helpers ──────────────────────────────────────────────────────────────
  isLive(match: MatchRow): boolean {
    return new Date(match.start_time) <= new Date() && !match.is_deleted;
  }

  isLoadingPeriods(matchId: number): boolean {
    return this.loadingPeriods().has(matchId);
  }

  getPeriods(matchId: number): PeriodRow[] {
    return this.periodsMap().get(matchId) ?? [];
  }

  leagueOptions() {
    return this.leagues().map((l) => ({ label: l.name, value: l.league_id }));
  }

  catalogOptions() {
    return this.catalogs().map((c) => ({ label: c.description || c.value, value: c.catalog_id }));
  }

  getCatalogName(catalogId: number): string {
    const c = this.catalogs().find((cat) => cat.catalog_id === catalogId);
    return c ? (c.description || c.value) : `Período ${catalogId}`;
  }
}
