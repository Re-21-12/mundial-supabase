import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ScheduledMatch, ScheduleService } from '../../../services/schedule.service';

type MatchDay = { date: string; matches: ScheduledMatch[] };

@Component({
  selector: 'app-schedule',
  imports: [DatePipe],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class SchedulePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly scheduleService = inject(ScheduleService);

  protected readonly matchDays = signal<MatchDay[]>([]);
  protected readonly isLoading = signal(true);

  async ngOnInit() {
    const leagueId = Number(this.route.snapshot.paramMap.get('id'));
    this.isLoading.set(true);
    const matches = await this.scheduleService.loadSchedule(leagueId);
    this.matchDays.set(this.groupByDate(matches));
    this.isLoading.set(false);
  }

  private groupByDate(matches: ScheduledMatch[]): MatchDay[] {
    const map = new Map<string, ScheduledMatch[]>();
    for (const m of matches) {
      const dateKey = m.start_time.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(m);
    }
    return Array.from(map.entries()).map(([date, ms]) => ({ date, matches: ms }));
  }
}
