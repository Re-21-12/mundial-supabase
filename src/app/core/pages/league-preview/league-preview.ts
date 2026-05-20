import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StandingRow, StandingsService } from '../../services/standings.service';

@Component({
  selector: 'app-league-preview',
  templateUrl: './league-preview.html',
  styleUrl: './league-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaguePreviewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly standingsService = inject(StandingsService);

  protected readonly standings = signal<StandingRow[]>([]);
  protected readonly isLoading = signal(true);
  protected leagueId = 0;

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.leagueId) {
      this.router.navigate(['/home']);
      return;
    }
    const data = await this.standingsService.loadStandings(this.leagueId);
    this.standings.set(data);
    this.isLoading.set(false);
  }

  protected joinLeague() {
    // Restore the invite token if still in sessionStorage so the auth flow picks it up
    this.router.navigate(['/auth']);
  }
}
