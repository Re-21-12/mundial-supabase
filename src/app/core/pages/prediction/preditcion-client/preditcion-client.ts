import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DynamicForm } from '../../../../shared/features/dynamic-form/dynamic-form';
import { formFields } from '../../../../shared/features/dynamic-form/utils/forms';
import { NotificationService } from '../../../../shared/services/notification-service';
import {
  PredictionClientService,
  PredictionMatchCard,
  PredictionLeagueInfo,
} from './prediction-client.service';

@Component({
  selector: 'app-preditcion-client',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, DynamicForm],
  templateUrl: './preditcion-client.html',
  styleUrl: './preditcion-client.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreditcionClient implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(PredictionClientService);
  private readonly notif = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal<number | null>(null);
  protected readonly saved = signal<Set<number>>(new Set());
  protected readonly now = signal<Date>(new Date());
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly league = signal<PredictionLeagueInfo | null>(null);
  protected readonly userLeagueId = signal<number | null>(null);
  protected readonly cards = signal<PredictionMatchCard[]>([]);
  protected readonly focusedMatchId = signal<number | null>(null);
  protected readonly expandedMatchId = signal<number | null>(null);

  protected readonly initialDataByMatch = computed(() => {
    const map = new Map<number, Record<string, any>>();

    for (const card of this.cards()) {
      if (!card.prediction) continue;

      map.set(card.matchId, {
        first_team_score: card.prediction.firstTeamScore,
        second_team_score: card.prediction.secondTeamScore,
        wager_amount: card.prediction.wagerAmount,
      });
    }

    return map;
  });

  protected readonly isPaidLeague = computed(() => (this.league()?.buy_in_amount ?? 0) > 0);

  // Form fields: include wager_amount only for paid leagues
  protected readonly scoreFields = computed(() => {
    const all = formFields['predictionClientForm'].fields;
    if (!this.isPaidLeague()) {
      return all.filter((f) => f.key !== 'wager_amount');
    }

    return all.map((field) =>
      field.key === 'wager_amount'
        ? {
            ...field,
            state: { ...field.state, required: true },
            rules: [Validators.required, Validators.min(1)],
          }
        : field,
    );
  });

  protected readonly groupedCards = computed(() => {
    const all = this.cards();
    const focused = this.focusedMatchId();
    const now = this.now();
    const isDone = (c: PredictionMatchCard) => new Date(c.endTime) < now;
    const upcoming = all.filter((c) => !isDone(c) && c.matchId !== focused);
    const finished = all.filter((c) => isDone(c) && c.matchId !== focused);
    const focusedCard = all.find((c) => c.matchId === focused) ?? null;
    return { focusedCard, upcoming, finished };
  });

  async ngOnInit(): Promise<void> {
    this.tickInterval = setInterval(() => this.now.set(new Date()), 1000);

    const matchId = Number(this.route.snapshot.paramMap.get('id'));
    if (!matchId) {
      this.error.set('Partido no encontrado.');
      this.loading.set(false);
      return;
    }

    this.focusedMatchId.set(matchId);
    this.expandedMatchId.set(matchId);

    const ctx = await this.svc.loadContext(matchId);
    if (!ctx) {
      this.error.set(
        'No tienes acceso a esta liga. Debes estar registrado e inscrito para ver partidos y apostar.',
      );
      this.loading.set(false);
      return;
    }

    this.league.set(ctx.league);
    this.userLeagueId.set(ctx.userLeagueId);
    this.cards.set(ctx.cards);
    this.loading.set(false);
  }

  toggleExpand(matchId: number): void {
    this.expandedMatchId.update((id) => (id === matchId ? null : matchId));
  }

  isExpanded(matchId: number): boolean {
    return this.expandedMatchId() === matchId;
  }

  isSubmitting(matchId: number): boolean {
    return this.submitting() === matchId;
  }

  isSaved(matchId: number): boolean {
    return this.saved().has(matchId);
  }

  getInitialData(card: PredictionMatchCard): Record<string, any> | null {
    return this.initialDataByMatch().get(card.matchId) ?? null;
  }

  async onSubmitPrediction(card: PredictionMatchCard, jsonData: string): Promise<void> {
    const userLeagueId = this.userLeagueId();
    if (!userLeagueId) {
      this.notif.notify('error', 'Error', 'No eres miembro de esta liga.');
      return;
    }

    const data = JSON.parse(jsonData);
    this.submitting.set(card.matchId);

    const league = this.league()!;
    const wagerAmount = this.isPaidLeague() ? Math.max(0, Number(data.wager_amount) || 0) : 0;
    const ok = await this.svc.upsertPrediction({
      matchId: card.matchId,
      userLeagueId,
      firstTeamScore: Math.max(0, Number(data.first_team_score) || 0),
      secondTeamScore: Math.max(0, Number(data.second_team_score) || 0),
      wagerAmount,
      leagueId: league.league_id,
      buyInAmount: league.buy_in_amount,
      leagueName: league.name,
    });

    this.submitting.set(null);

    if (ok) {
      this.cards.update((cards) =>
        cards.map((c) =>
          c.matchId === card.matchId
            ? {
                ...c,
                prediction: {
                  predictionId: c.prediction?.predictionId ?? null,
                  firstTeamScore: Number(data.first_team_score) || 0,
                  secondTeamScore: Number(data.second_team_score) || 0,
                  wagerAmount,
                },
              }
            : c,
        ),
      );
      this.saved.update((s) => new Set(s).add(card.matchId));
      this.notif.notify(
        'success',
        'Predicción guardada',
        `${card.homeTeamName} vs ${card.awayTeamName}`,
      );
    } else {
      this.notif.notify('error', 'Error', 'No se pudo guardar la predicción.');
    }
  }

  ngOnDestroy(): void {
    if (this.tickInterval !== null) clearInterval(this.tickInterval);
  }

  // ── Reactive time helpers ──────────────────────────────────────────────────

  protected canPredict(card: PredictionMatchCard): boolean {
    return this.minutesUntilStart(card) > 15;
  }

  protected isLive(card: PredictionMatchCard): boolean {
    const now = this.now();
    return new Date(card.startTime) <= now && new Date(card.endTime) >= now;
  }

  protected isFinished(card: PredictionMatchCard): boolean {
    return new Date(card.endTime) < this.now();
  }

  /** True when 0 < minutesUntilStart <= 15 (warning window, predictions closed). */
  protected isInWarningWindow(card: PredictionMatchCard): boolean {
    const mins = this.minutesUntilStart(card);
    return mins > 0 && mins <= 15;
  }

  protected minutesUntilStart(card: PredictionMatchCard): number {
    return (new Date(card.startTime).getTime() - this.now().getTime()) / 60000;
  }

  protected getCountdown(card: PredictionMatchCard): string {
    const totalSecs = Math.max(
      0,
      Math.floor((new Date(card.startTime).getTime() - this.now().getTime()) / 1000),
    );
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getRoundLabel(card: PredictionMatchCard): string {
    if (card.grupoId !== null) return 'Fase de grupos';
    const labels: Record<number, string> = {
      1: 'Dieciseisavos',
      2: 'Octavos',
      3: 'Cuartos de final',
      4: 'Semifinal',
      5: 'Final',
    };
    return card.round !== null ? (labels[card.round] ?? `Ronda ${card.round}`) : '';
  }
}
