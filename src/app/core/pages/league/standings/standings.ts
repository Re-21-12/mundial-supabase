import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StandingRow, StandingsService } from '../../../services/standings.service';
import { SendInvitationComponent } from '../../invitation/send-invitation/send-invitation';
import { ApprovalService } from '../approval.service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';

@Component({
  selector: 'app-standings',
  imports: [SendInvitationComponent, RouterLink],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
})
export class StandingsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly standingsService = inject(StandingsService);
  private readonly approvalSvc = inject(ApprovalService);
  private readonly auth = inject(AuthFacade);

  protected readonly standings = signal<StandingRow[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showInvite = signal(false);
  protected readonly isLeagueOwner = signal(false);
  protected readonly pendingCount = signal(0);

  protected leagueId = 0;

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    await this.refresh();
    this.standingsService.subscribeToChanges(this.leagueId, () => this.refresh());
    await this._checkOwnerAndPending();
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

  private async _checkOwnerAndPending() {
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) return;

    const info = await this.approvalSvc.getLeagueInfo(this.leagueId);
    if (info && info.ownerId === userId) {
      this.isLeagueOwner.set(true);
      const count = await this.approvalSvc.getPendingCount(this.leagueId);
      this.pendingCount.set(count);
    }
  }
}
