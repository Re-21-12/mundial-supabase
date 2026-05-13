import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApprovalService, PendingParticipant } from '../../../core/services/approval.service';
import { AuthFacade } from '../../features/auth/auth.facade';

@Component({
  selector: 'app-approval-panel',
  imports: [DatePipe],
  templateUrl: './approval-panel.component.html',
  styleUrl: './approval-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalPanelComponent implements OnInit {
  readonly leagueId = input.required<number>();

  private readonly approvalService = inject(ApprovalService);
  private readonly authFacade = inject(AuthFacade);

  protected readonly participants = signal<PendingParticipant[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly actionError = signal('');

  async ngOnInit() {
    const { data } = await this.approvalService.getPendingParticipants(this.leagueId());
    this.participants.set(data);
    this.isLoading.set(false);
  }

  protected async approve(id: number) {
    const adminId = Number(this.authFacade.getInternalUserId());
    const { error } = await this.approvalService.approve(id, adminId);
    if (error) { this.actionError.set('Error al aprobar.'); return; }
    this.participants.update(list => list.filter(p => p.user_league_id !== id));
  }

  protected async reject(id: number) {
    const adminId = Number(this.authFacade.getInternalUserId());
    const { error } = await this.approvalService.reject(id, adminId);
    if (error) { this.actionError.set('Error al rechazar.'); return; }
    this.participants.update(list => list.filter(p => p.user_league_id !== id));
  }
}
