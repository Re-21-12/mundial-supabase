import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PredictionClientService, PredictionMatchCard } from './prediction-client.service';

interface LeagueGroup {
  league: { league_id: number; name: string; buy_in_amount: number };
  userLeagueId: number;
  matches: PredictionMatchCard[];
}

@Component({
  selector: 'app-preditcion-client-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preditcion-client-list.html',
  styleUrl: './preditcion-client-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreditcionClientList implements OnInit, OnDestroy {
  private readonly svc = inject(PredictionClientService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly leagueGroups = signal<LeagueGroup[]>([]);
  protected readonly selectedLeagueId = signal<number | null>(null);
  protected readonly now = signal<Date>(new Date());
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly selectedGroup = computed<LeagueGroup | null>(() => {
    const id = this.selectedLeagueId();
    return this.leagueGroups().find((g) => g.league.league_id === id) ?? null;
  });

  protected readonly upcomingCount = computed(() => {
    const g = this.selectedGroup();
    if (!g) return 0;
    const now = this.now();
    return g.matches.filter((m) => new Date(m.endTime) > now).length;
  });

  async ngOnInit(): Promise<void> {
    this.tickInterval = setInterval(() => this.now.set(new Date()), 1000);
    this.loading.set(true);
    try {
      const list = await this.svc.listLeaguesWithUpcomingMatches();
      this.leagueGroups.set(list as LeagueGroup[]);
      if (list.length > 0) {
        this.selectedLeagueId.set(list[0].league.league_id);
      }
    } catch {
      this.error.set('No se pudieron cargar tus ligas.');
    }
    this.loading.set(false);
  }

  ngOnDestroy(): void {
    if (this.tickInterval !== null) clearInterval(this.tickInterval);
  }

  protected selectLeague(id: number): void {
    this.selectedLeagueId.set(id);
  }

  protected goToMatch(matchId: number): void {
    this.router.navigate(['/prediction-client', matchId]);
  }

  // ── Reactive time helpers ──────────────────────────────────────────

  protected minutesUntilStart(m: PredictionMatchCard): number {
    return (new Date(m.startTime).getTime() - this.now().getTime()) / 60000;
  }

  protected canPredict(m: PredictionMatchCard): boolean {
    return this.minutesUntilStart(m) > 15;
  }

  protected isLive(m: PredictionMatchCard): boolean {
    const now = this.now();
    return new Date(m.startTime) <= now && new Date(m.endTime) >= now;
  }

  protected isFinished(m: PredictionMatchCard): boolean {
    return new Date(m.endTime) < this.now();
  }

  protected isInWarningWindow(m: PredictionMatchCard): boolean {
    const mins = this.minutesUntilStart(m);
    return mins > 0 && mins <= 15;
  }

  protected getCountdown(m: PredictionMatchCard): string {
    const secs = Math.max(
      0,
      Math.floor((new Date(m.startTime).getTime() - this.now().getTime()) / 1000),
    );
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  }

  protected formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
