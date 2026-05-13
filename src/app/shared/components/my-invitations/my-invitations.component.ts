import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthFacade } from '../../features/auth/auth.facade';
import { InvitationService, PendingInvitation } from '../../../core/services/invitation.service';

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

  async ngOnInit() {
    const email = this.authFacade.currentUser()?.email ?? '';
    if (!email) { this.isLoading.set(false); return; }

    const { data } = await this.invitationService.getPendingForUser(email);
    this.invitations.set(data);
    this.isLoading.set(false);
  }

  protected async accept(id: number) {
    this.actionError.set('');
    const { error } = await this.invitationService.accept(id);
    if (error) { this.actionError.set('No se pudo aceptar. Intenta de nuevo.'); return; }
    this.invitations.update(list => list.filter(i => i.invitation_id !== id));
  }

  protected async decline(id: number) {
    this.actionError.set('');
    const { error } = await this.invitationService.decline(id);
    if (error) { this.actionError.set('No se pudo rechazar. Intenta de nuevo.'); return; }
    this.invitations.update(list => list.filter(i => i.invitation_id !== id));
  }
}
