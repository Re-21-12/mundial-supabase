import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { InvitationService } from '../../services/invitation.service';

type InviteState = 'loading' | 'processing' | 'success' | 'error' | 'unauthenticated';

@Component({
  selector: 'app-invite',
  imports: [RouterLink],
  templateUrl: './invite.html',
  styleUrl: './invite.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthFacade);
  private readonly invitationService = inject(InvitationService);

  protected readonly state = signal<InviteState>('loading');
  protected readonly errorMsg = signal('');
  protected leagueId = 0;

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      this.errorMsg.set('Token de invitación no encontrado en la URL.');
      return;
    }

    const userId = Number(this.auth.getInternalUserId());
    if (!userId) {
      sessionStorage.setItem('invite_token', token);
      this.state.set('unauthenticated');
      return;
    }

    await this.processToken(token, userId);
  }

  private async processToken(token: string, userId: number) {
    this.state.set('processing');
    const result = await this.invitationService.acceptMagicLink(token, userId);
    if (result.error) {
      this.state.set('error');
      this.errorMsg.set(result.error);
    } else {
      this.leagueId = result.leagueId!;
      this.state.set('success');
    }
  }

  protected goToLeague() {
    this.router.navigate(['/league', this.leagueId, 'standings']);
  }

  protected goToAuth() {
    this.router.navigate(['/auth']);
  }
}
