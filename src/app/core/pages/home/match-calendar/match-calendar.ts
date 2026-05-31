import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchCard } from '../models/home.models';

interface CalendarDay {
  date: Date;
  matches: MatchCard[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-match-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-calendar.html',
  styleUrl: './match-calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchCalendarComponent {
  readonly matches = input<MatchCard[]>([]);

  readonly viewDate = signal(new Date());
  readonly selectedDay = signal<CalendarDay | null>(null);

  readonly DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly monthLabel = computed(() =>
    this.viewDate().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' }),
  );

  readonly calendarDays = computed((): CalendarDay[] => {
    const view = this.viewDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday-based
    const lastDay = new Date(year, month + 1, 0);

    const matchesByDate = new Map<string, MatchCard[]>();
    for (const card of this.matches()) {
      const d = new Date(card.match.start_time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!matchesByDate.has(key)) matchesByDate.set(key, []);
      matchesByDate.get(key)!.push(card);
    }

    const days: CalendarDay[] = [];

    for (let i = startDow - 1; i >= 0; i--) {
      days.push(this.buildDay(new Date(year, month, -i), false, today, matchesByDate));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(this.buildDay(new Date(year, month, d), true, today, matchesByDate));
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push(this.buildDay(new Date(year, month + 1, i), false, today, matchesByDate));
    }

    return days;
  });

  readonly weeks = computed((): CalendarDay[][] => {
    const days = this.calendarDays();
    const result: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  });

  private buildDay(
    date: Date,
    isCurrentMonth: boolean,
    today: Date,
    byDate: Map<string, MatchCard[]>,
  ): CalendarDay {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const norm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      date,
      matches: (byDate.get(key) ?? []).sort(
        (a, b) => new Date(a.match.start_time).getTime() - new Date(b.match.start_time).getTime(),
      ),
      isCurrentMonth,
      isToday: norm.getTime() === today.getTime(),
      isPast: norm.getTime() < today.getTime(),
    };
  }

  prevMonth(): void {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.selectedDay.set(null);
  }

  nextMonth(): void {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.selectedDay.set(null);
  }

  selectDay(day: CalendarDay): void {
    if (!day.matches.length) return;
    this.selectedDay.update((prev) => (prev?.date.getTime() === day.date.getTime() ? null : day));
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
