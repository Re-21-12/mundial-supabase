import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import type { HomeStat } from '../models/home.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-bar',
  templateUrl: './stats-bar.html',
  styleUrl: './stats-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class StatsBarComponent implements OnInit, OnDestroy {
  jackpot = input<number>(0);

  private interval: ReturnType<typeof setInterval> | null = null;

  readonly displayedStats = signal<HomeStat[]>([
    {
      icon: 'pi pi-dollar',
      label: 'Premio Acumulado',
      value: 0,
      prefix: 'Q',
      suffix: 'Q',
      colorClass: 'stat-gold',
    },
    { icon: 'pi pi-calendar', label: 'Partidos Hoy', value: 0, colorClass: 'stat-blue' },
    { icon: 'pi pi-users', label: 'Jugadores Activos', value: 0, colorClass: 'stat-green' },
    { icon: 'pi pi-trophy', label: 'Predicciones Ganadoras', value: 0, colorClass: 'stat-purple' },
  ]);

  private targetStats = [
    { value: 250000, prefix: 'Q', suffix: 'Q' },
    { value: 12 },
    { value: 3847 },
    { value: 18923 },
  ];

  ngOnInit(): void {
    this.animateCounters();
  }

  private animateCounters(): void {
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    let step = 0;

    this.interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      this.displayedStats.update((stats) =>
        stats.map((stat, i) => ({
          ...stat,
          value: Math.round((this.targetStats[i]?.value ?? 0) * ease),
        })),
      );

      if (step >= steps) {
        if (this.interval) clearInterval(this.interval);
      }
    }, stepTime);
  }

  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }
}
