import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase-service';
import { DynamicService } from '../../services/dynamic-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { formFields as matchPeriodFormFields } from '../match-period/match-period-form';
import type { Database } from '../../../types/database.types';
import {
  getMatchPhaseLabel,
  getMatchPhaseSeverity,
  isMatchLive,
  isMatchClosed,
} from './match-phase.util';

type MatchRow = Database['public']['Tables']['MATCH']['Row'];
type PeriodRow = Database['public']['Tables']['MATCH_PERIOD']['Row'];
type LeagueRow = Database['public']['Tables']['LEAGUE']['Row'];
type CatalogRow = Database['public']['Tables']['CATALOG']['Row'];
type TeamRow = Database['public']['Tables']['TEAM']['Row'];

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
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule, DynamicForm],
  templateUrl: './match-scoreboard.html',
  styleUrl: './match-scoreboard.css',
})
export class MatchScoreboardPage implements OnInit, OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly dynamicService = inject(DynamicService);
  private readonly authFacade = inject(AuthFacade);
  private channel: RealtimeChannel | null = null;

  // ── Filter state ──────────────────────────────────────────────────────────────
  readonly leagues = signal<LeagueRow[]>([]);
  readonly selectedLeagueId = signal<number | null>(null);
  readonly selectedRound = signal<number | null>(null);
  readonly catalogs = signal<CatalogRow[]>([]);
  readonly teams = signal<TeamRow[]>([]);

  // ── Data ──────────────────────────────────────────────────────────────────────
  readonly matches = signal<MatchRow[]>([]);
  readonly periodsMap = signal<Map<number, PeriodRow[]>>(new Map());

  // ── UI state ──────────────────────────────────────────────────────────────────
  readonly expandedMatchId = signal<number | null>(null);
  readonly loadingMatches = signal(false);
  readonly loadingPeriods = signal<Set<number>>(new Set());
  readonly roundOptions = computed(() => {
    const rounds = [
      ...new Set(
        this.matches()
          .map((match) => match.round)
          .filter((round) => round != null),
      ),
    ].sort((a, b) => Number(a) - Number(b));

    return [
      { label: 'Todas las rondas', value: null },
      ...rounds.map((round) => ({ label: `Ronda ${round}`, value: round })),
    ];
  });
  readonly filteredMatches = computed(() => {
    const selectedRound = this.selectedRound();
    if (selectedRound == null) {
      return this.matches();
    }

    return this.matches().filter((match) => match.round === selectedRound);
  });
  readonly periodFields = matchPeriodFormFields['matchPeriodForm'].fields.filter(
    (field) => field.key !== 'match_id',
  );

  // In-flight edits keyed by period_id (null = new period for that match)
  readonly edits = signal<Map<string, PeriodEdit>>(new Map());

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadLeagues(), this.loadCatalogs(), this.loadTeams()]);
  }

  ngOnDestroy(): void {
    this.channel?.unsubscribe();
  }

  // ── Load helpers ──────────────────────────────────────────────────────────────
  private async loadLeagues(): Promise<void> {
    // Only load leagues the current user has joined
    await this.authFacade.waitForAuthReady();
    const internalUserId = this.authFacade.getInternalUserId();
    if (!internalUserId) {
      this.leagues.set([]);
      return;
    }

    // Get league ids from USER_LEAGUE
    const { data: ulData } = await this.supabase.client
      .from('USER_LEAGUE')
      .select('league_id')
      .eq('user_id', Number(internalUserId))
      .eq('is_deleted', false);

    const leagueIds = (ulData ?? []).map((r: any) => r.league_id).filter(Boolean);
    if (!leagueIds || leagueIds.length === 0) {
      this.leagues.set([]);
      return;
    }

    const { data } = await this.supabase.client
      .from('LEAGUE')
      .select('*')
      .in('league_id', leagueIds)
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

  private async loadTeams(): Promise<void> {
    const { data } = await this.supabase.client
      .from('TEAM')
      .select('team_id, name')
      .eq('is_deleted', false)
      .order('name');
    if (data) this.teams.set(data as TeamRow[]);
  }

  async onLeagueChange(leagueId: number | null): Promise<void> {
    this.selectedLeagueId.set(leagueId);
    this.selectedRound.set(null);
    this.expandedMatchId.set(null);
    this.periodsMap.set(new Map());
    this.edits.set(new Map());
    this.channel?.unsubscribe();

    if (!leagueId) {
      this.matches.set([]);
      return;
    }

    // Prevent loading matches for leagues the user hasn't joined
    if (!this.leagues().some((l) => l.league_id === leagueId)) {
      this.matches.set([]);
      return;
    }

    this.loadingMatches.set(true);
    const { data } = await this.supabase.client
      .from('MATCH')
      .select('*')
      .eq('league_id', leagueId)
      .eq('is_deleted', false)
      .order('start_time');

    console.log('Loaded matches for league', leagueId, data);
    if (data) this.matches.set(data as MatchRow[]);
    this.loadingMatches.set(false);

    this.subscribeRealtime(leagueId);
  }

  onRoundChange(round: number | null): void {
    this.selectedRound.set(round);
    this.expandedMatchId.set(null);
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
    this.loadingPeriods.update((s) => {
      const n = new Set(s);
      n.delete(matchId);
      return n;
    });
  }

  // ── Realtime ──────────────────────────────────────────────────────────────────
  private subscribeRealtime(leagueId: number): void {
    this.channel = this.supabase.client
      .channel(`scoreboard-league-${leagueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'MATCH', filter: `league_id=eq.${leagueId}` },
        (payload) => this.handleMatchChange(payload),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'MATCH_PERIOD' }, (payload) =>
        this.handlePeriodChange(payload),
      )
      .subscribe();
  }

  private handleMatchChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as MatchRow;
    const removed = payload.old as Partial<MatchRow>;
    this.matches.update((list) => {
      if (payload.eventType === 'INSERT') return [...list, incoming];
      if (payload.eventType === 'UPDATE')
        return list.map((m) => (m.match_id === incoming.match_id ? incoming : m));
      if (payload.eventType === 'DELETE')
        return list.filter((m) => m.match_id !== removed.match_id);
      return list;
    });
  }

  private handlePeriodChange(payload: { eventType: string; new: unknown; old: unknown }): void {
    const incoming = payload.new as PeriodRow;
    const removed = payload.old as Partial<PeriodRow>;
    const matchId = incoming?.match_id ?? removed?.match_id;
    if (!matchId) return;

    this.periodsMap.update((m) => {
      if (!m.has(matchId)) return m;
      const next = new Map(m);
      let list = [...(next.get(matchId) ?? [])];
      if (payload.eventType === 'INSERT') list = [...list, incoming];
      if (payload.eventType === 'UPDATE')
        list = list.map((p) => (p.period_id === incoming.period_id ? incoming : p));
      if (payload.eventType === 'DELETE')
        list = list.filter((p) => p.period_id !== removed.period_id);
      next.set(matchId, list);
      return next;
    });
  }

  // ── Edits ─────────────────────────────────────────────────────────────────────
  editKey(matchId: number, periodId: number | null): string {
    return periodId != null ? `p-${periodId}` : `new-${matchId}`;
  }

  periodFormInitialData(edit: PeriodEdit): Record<string, unknown> {
    return {
      catalog_id: edit.catalogId,
      first_team_score: edit.home,
      second_team_score: edit.away,
    };
  }

  newPeriodFormInitialData(matchId: number): Record<string, unknown> {
    const defaultCatalog = this.catalogs()[0]?.catalog_id ?? 1;

    return {
      catalog_id: defaultCatalog,
      first_team_score: 0,
      second_team_score: 0,
      match_id: matchId,
    };
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
      next.set(key, {
        periodId: null,
        matchId,
        catalogId: defaultCatalog,
        home: 0,
        away: 0,
        saving: false,
      });
      return next;
    });
  }

  cancelEdit(key: string): void {
    this.edits.update((m) => {
      const n = new Map(m);
      n.delete(key);
      return n;
    });
  }

  getEdit(matchId: number, periodId: number | null): PeriodEdit | undefined {
    return this.edits().get(this.editKey(matchId, periodId));
  }

  isEditing(matchId: number, periodId: number | null): boolean {
    return this.edits().has(this.editKey(matchId, periodId));
  }

  async savePeriod(key: string, payloadJson: string): Promise<void> {
    const edit = this.edits().get(key);
    if (!edit) return;

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch (error) {
      console.error('Invalid match period payload', error);
      return;
    }

    this.edits.update((m) => {
      const n = new Map(m);
      n.set(key, { ...edit, saving: true });
      return n;
    });

    const payload = {
      match_id: edit.matchId,
      catalog_id: this.toNumber(parsedPayload['catalog_id'], edit.catalogId),
      first_team_score: this.toNullableNumber(parsedPayload['first_team_score']),
      second_team_score: this.toNullableNumber(parsedPayload['second_team_score']),
    };

    try {
      const response =
        edit.periodId != null
          ? await this.dynamicService.updateData('MATCH_PERIOD', payload, {
              field: 'period_id',
              value: String(edit.periodId),
            })
          : await this.dynamicService.insertData('MATCH_PERIOD', payload);

      if (response instanceof PostgrestError) {
        return;
      }

      this.cancelEdit(key);
      await this.loadPeriods(edit.matchId);
    } catch (error) {
      console.error('Error saving match period', error);
    } finally {
      const currentEdit = this.edits().get(key);
      if (currentEdit) {
        this.edits.update((m) => {
          const next = new Map(m);
          next.set(key, { ...currentEdit, saving: false });
          return next;
        });
      }
    }
  }

  // ── View helpers ──────────────────────────────────────────────────────────────
  isLive(match: MatchRow): boolean {
    return isMatchLive(match);
  }

  matchPhaseLabel(match: MatchRow): string {
    return getMatchPhaseLabel(match);
  }

  matchPhaseSeverity(match: MatchRow): 'success' | 'warn' | 'secondary' | 'danger' {
    return getMatchPhaseSeverity(match);
  }

  isMatchClosed(match: MatchRow): boolean {
    return isMatchClosed(match);
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

  getCatalogName(catalogId: number): string {
    const c = this.catalogs().find((cat) => cat.catalog_id === catalogId);
    return c ? c.description || c.value : `Período ${catalogId}`;
  }

  getTeamName(teamId: number | null | undefined): string {
    if (teamId == null) return 'Equipo';

    const team = this.teams().find((item) => item.team_id === teamId);
    return team?.name ?? `Equipo ${teamId}`;
  }

  getMatchRound(match: MatchRow): string {
    const round = (match as Record<string, unknown>)['round'];
    if (round === null || round === undefined || round === '') {
      return 'Sin ronda';
    }

    return `Ronda ${round}`;
  }

  getRoundLabel(round: number | null): string {
    return round == null ? 'Todas las rondas' : `Ronda ${round}`;
  }

  private toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
