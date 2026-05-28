import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApprovalService, PendingParticipant } from '../approval.service';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';

@Component({
  selector: 'app-approval',
  imports: [RouterLink, DatePipe],
  templateUrl: './approval.html',
  styleUrl: './approval.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly approvalSvc = inject(ApprovalService);
  private readonly auth = inject(AuthFacade);

  protected readonly isLoading = signal(true);
  protected readonly isOwner = signal(false);
  protected readonly leagueName = signal('');
  protected readonly participants = signal<PendingParticipant[]>([]);
  protected readonly processingId = signal<number | null>(null);
  protected readonly statusMsg = signal('');
  protected readonly statusType = signal<'success' | 'error' | ''>('');

  protected leagueId = 0;
  private adminId = 0;

  async ngOnInit() {
    this.leagueId = Number(this.route.snapshot.paramMap.get('id'));
    this.adminId = Number(this.auth.getInternalUserId());

    // Load league to verify ownership
    const info = await this.approvalSvc.getLeagueInfo(this.leagueId);
    if (info) {
      this.leagueName.set(info.name);
      this.isOwner.set(info.ownerId === this.adminId);
    }

    if (this.isOwner()) {
      await this._load();
    }

    this.isLoading.set(false);
  }

  private async _load() {
    const { data } = await this.approvalSvc.getPendingParticipants(this.leagueId);
    this.participants.set(data);
  }

  protected displayName(p: PendingParticipant): string {
    return (p.USER as any)?.name || (p.USER as any)?.email || `Usuario #${p.user_id}`;
  }

  protected displayEmail(p: PendingParticipant): string {
    return (p.USER as any)?.email ?? '';
  }

  protected async approve(p: PendingParticipant) {
    this.processingId.set(p.user_league_id);
    try {
      await this.approvalSvc.approveWithNotification(
        p.user_league_id,
        this.adminId,
        this.leagueName(),
        p.user_id,
        this.leagueId,
      );
      this._showStatus(`✓ ${this.displayName(p)} fue aprobado`, 'success');
      await this._load();
    } catch {
      this._showStatus('Error al aprobar. Intenta de nuevo.', 'error');
    } finally {
      this.processingId.set(null);
    }
  }

  protected async reject(p: PendingParticipant) {
    this.processingId.set(p.user_league_id);
    try {
      await this.approvalSvc.rejectWithNotification(
        p.user_league_id,
        this.adminId,
        this.leagueName(),
        p.user_id,
        this.leagueId,
      );
      this._showStatus(`✗ ${this.displayName(p)} fue rechazado`, 'error');
      await this._load();
    } catch {
      this._showStatus('Error al rechazar. Intenta de nuevo.', 'error');
    } finally {
      this.processingId.set(null);
    }
  }

  private _showStatus(msg: string, type: 'success' | 'error') {
    this.statusMsg.set(msg);
    this.statusType.set(type);
    setTimeout(() => { this.statusMsg.set(''); this.statusType.set(''); }, 3500);
  }
}
