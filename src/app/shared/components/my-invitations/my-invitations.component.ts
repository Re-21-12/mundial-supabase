import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthFacade } from '../../features/auth/auth.facade';
import { InvitationService, PendingInvitation } from '../notification-inbox/invitation.service';

@Component({
  selector: 'app-my-invitations',
  imports: [DatePipe],
  templateUrl: './my-invitations.component.html',
  styleUrl: './my-invitations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInvitationsComponent implements OnInit {
  private readonly invitationService = inject(InvitationService);
  private readonly authFacade = inject(AuthFacade);

  protected readonly invitations = signal<PendingInvitation[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly actionError = signal('');
  protected readonly acting = signal<Set<number>>(new Set());

  async ngOnInit() {
    const email = this.authFacade.currentUser()?.email ?? '';
    if (!email) {
      this.isLoading.set(false);
      return;
    }

    const { data } = await this.invitationService.getPendingForUser(email);
    this.invitations.set(data);
    this.isLoading.set(false);
  }

  protected isActing(id: number): boolean {
    return this.acting().has(id);
  }

  protected isExpiringSoon(inv: PendingInvitation): boolean {
    const hoursLeft = (new Date(inv.expiration_date).getTime() - Date.now()) / 3_600_000;
    return hoursLeft > 0 && hoursLeft < 6;
  }

  protected async accept(id: number): Promise<void> {
    this.actionError.set('');
    this.acting.update((s) => new Set(s).add(id));
    const { error } = await this.invitationService.accept(id);
    this.acting.update((s) => { const n = new Set(s); n.delete(id); return n; });
    if (error) {
      this.actionError.set('No se pudo aceptar. Intenta de nuevo.');
      return;
    }
    this.invitations.update((list) => list.filter((i) => i.invitation_id !== id));
  }

  protected async decline(id: number): Promise<void> {
    this.actionError.set('');
    this.acting.update((s) => new Set(s).add(id));
    const { error } = await this.invitationService.decline(id);
    this.acting.update((s) => { const n = new Set(s); n.delete(id); return n; });
    if (error) {
      this.actionError.set('No se pudo rechazar. Intenta de nuevo.');
      return;
    }
    this.invitations.update((list) => list.filter((i) => i.invitation_id !== id));
  }
}
