import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StandingRow, StandingsService } from '../../../services/standings.service';
import { SendInvitationComponent } from '../../invitation/send-invitation/send-invitation';
import { ApprovalService } from '../approval/approval.service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { SimulateMatchService } from '../../../services/simulate-match.service';
import { NotificationService } from '../../../../shared/services/notification-service';

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
  private readonly simulateSvc = inject(SimulateMatchService);
  private readonly notif = inject(NotificationService);

  protected readonly standings = signal<StandingRow[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly showInvite = signal(false);
  protected readonly isLeagueOwner = signal(false);
  protected readonly pendingCount = signal(0);
  protected readonly simulating = signal(false);
  protected readonly advancing = signal(false);

  protected leagueId = 0;

  protected readonly isAdmin = () =>
    (this.auth.role() ?? '').toLowerCase() === 'admin';

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

  protected async onSimulateMatch(): Promise<void> {
    if (this.simulating()) return;
    this.simulating.set(true);
    const result = await this.simulateSvc.simulateNextMatch(this.leagueId);
    this.simulating.set(false);

    if (result.success) {
      this.notif.notify('success', 'Partido simulado', result.summary ?? '');
      await this.refresh();
    } else {
      this.notif.notify('warn', 'Sin partidos', result.error ?? 'No hay partidos pendientes.');
    }
  }

  protected async onAdvanceBracket(): Promise<void> {
    if (this.advancing()) return;
    this.advancing.set(true);
    const result = await this.simulateSvc.advanceBracket(this.leagueId);
    this.advancing.set(false);

    if (result.success) {
      this.notif.notify('success', 'Bracket actualizado', result.summary ?? '');
    } else {
      this.notif.notify('error', 'Error', result.error ?? 'No se pudo avanzar el bracket.');
    }
  }
}
