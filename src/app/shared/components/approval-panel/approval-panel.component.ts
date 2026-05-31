import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApprovalService, PendingParticipant } from '../../../core/pages/league/approval/approval.service';
import { AuthFacade } from '../../features/auth/auth.facade';

@Component({
  selector: 'app-approval-panel',
  imports: [DatePipe],
  templateUrl: './approval-panel.component.html',
  styleUrl: './approval-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalPanelComponent implements OnChanges {
  readonly leagueId            = input.required<number>();
  readonly leagueName          = input<string>('');
  readonly approvedOrRejected  = output<void>();

  private readonly approvalService = inject(ApprovalService);
  private readonly authFacade      = inject(AuthFacade);

  protected readonly participants = signal<PendingParticipant[]>([]);
  protected readonly isLoading    = signal(true);
  protected readonly actionError  = signal('');
  protected readonly acting       = signal<Set<number>>(new Set());

  async ngOnChanges(): Promise<void> {
    this.isLoading.set(true);
    this.participants.set([]);
    this.actionError.set('');
    const { data } = await this.approvalService.getPendingParticipants(this.leagueId());
    this.participants.set(data);
    this.isLoading.set(false);
  }

  protected isActing(id: number): boolean {
    return this.acting().has(id);
  }

  private startAction(id: number) {
    this.acting.update((s) => new Set(s).add(id));
    this.actionError.set('');
  }

  private endAction(id: number) {
    this.acting.update((s) => { const n = new Set(s); n.delete(id); return n; });
  }

  protected async approve(p: PendingParticipant): Promise<void> {
    this.startAction(p.user_league_id);
    const adminId = Number(this.authFacade.getInternalUserId());
    try {
      await this.approvalService.approveWithNotification(
        p.user_league_id,
        adminId,
        this.leagueName() || `Liga ${this.leagueId()}`,
        p.user_id,
        this.leagueId(),
      );
      this.participants.update((list) => list.filter((x) => x.user_league_id !== p.user_league_id));
      this.approvedOrRejected.emit();
    } catch {
      this.actionError.set('No se pudo aprobar. Intenta de nuevo.');
    } finally {
      this.endAction(p.user_league_id);
    }
  }

  protected async reject(p: PendingParticipant): Promise<void> {
    this.startAction(p.user_league_id);
    const adminId = Number(this.authFacade.getInternalUserId());
    try {
      await this.approvalService.rejectWithNotification(
        p.user_league_id,
        adminId,
        this.leagueName() || `Liga ${this.leagueId()}`,
        p.user_id,
        this.leagueId(),
      );
      this.participants.update((list) => list.filter((x) => x.user_league_id !== p.user_league_id));
      this.approvedOrRejected.emit();
    } catch {
      this.actionError.set('No se pudo rechazar. Intenta de nuevo.');
    } finally {
      this.endAction(p.user_league_id);
    }
  }
}
