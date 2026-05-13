import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StandingRow, StandingsService } from '../../../services/standings.service';

@Component({
  selector: 'app-standings',
  imports: [],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
})
export class StandingsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly standingsService = inject(StandingsService);

  protected readonly standings = signal<StandingRow[]>([]);
  protected readonly isLoading = signal(true);

  private leagueId = 0;

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    await this.refresh();
    this.standingsService.subscribeToChanges(this.leagueId, () => this.refresh());
  }

  ngOnDestroy() {
    this.standingsService.unsubscribe();
  }

  private async refresh() {
    this.isLoading.set(true);
    const data = await this.standingsService.loadStandings(this.leagueId);
    this.standings.set(data);
    this.isLoading.set(false);
  }
}
