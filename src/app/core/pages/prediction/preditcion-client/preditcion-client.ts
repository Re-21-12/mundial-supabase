import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
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
export class PreditcionClient implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(PredictionClientService);
  private readonly notif = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal<number | null>(null);
  protected readonly saved = signal<Set<number>>(new Set());

  protected readonly league = signal<PredictionLeagueInfo | null>(null);
  protected readonly userLeagueId = signal<number | null>(null);
  protected readonly cards = signal<PredictionMatchCard[]>([]);
  protected readonly focusedMatchId = signal<number | null>(null);
  protected readonly expandedMatchId = signal<number | null>(null);

  protected readonly isPaidLeague = computed(() => (this.league()?.buy_in_amount ?? 0) > 0);

  // Form fields: include wager_amount only for paid leagues
  protected readonly scoreFields = computed(() => {
    const all = formFields['predictionClientForm'].fields;
    return this.isPaidLeague() ? all : all.filter((f) => f.key !== 'wager_amount');
  });

  protected readonly groupedCards = computed(() => {
    const all = this.cards();
    const focused = this.focusedMatchId();
    const upcoming = all.filter((c) => !c.isFinished && c.matchId !== focused);
    const finished = all.filter((c) => c.isFinished && c.matchId !== focused);
    const focusedCard = all.find((c) => c.matchId === focused) ?? null;
    return { focusedCard, upcoming, finished };
  });

  async ngOnInit(): Promise<void> {
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
      this.error.set('No se pudo cargar la información del partido.');
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
    if (!card.prediction) return null;
    return {
      first_team_score: card.prediction.firstTeamScore,
      second_team_score: card.prediction.secondTeamScore,
      wager_amount: card.prediction.wagerAmount,
    };
  }

  async onSubmitPrediction(card: PredictionMatchCard, jsonData: string): Promise<void> {
    const userLeagueId = this.userLeagueId();
    if (!userLeagueId) {
      this.notif.notify('error', 'Error', 'No eres miembro de esta liga.');
      return;
    }

    const data = JSON.parse(jsonData);
    this.submitting.set(card.matchId);

    const ok = await this.svc.upsertPrediction({
      matchId: card.matchId,
      userLeagueId,
      firstTeamScore: Math.max(0, Number(data.first_team_score) || 0),
      secondTeamScore: Math.max(0, Number(data.second_team_score) || 0),
      wagerAmount: Math.max(0, Number(data.wager_amount) || 0),
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
                  wagerAmount: Number(data.wager_amount) || 0,
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

  goBack(): void {
    this.router.navigate(['/home']);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', {
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
