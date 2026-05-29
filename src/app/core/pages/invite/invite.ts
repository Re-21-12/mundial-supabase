import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { SupabaseService } from '../../services/supabase-service';
import { InvitationService } from '../../../shared/components/notification-inbox/invitation.service';

type InviteState =
  | 'loading'
  | 'set_team_name'
  | 'processing'
  | 'success'
  | 'pending_approval'
  | 'error'
  | 'unauthenticated';

@Component({
  selector: 'app-invite',
  imports: [RouterLink, FormsModule],
  templateUrl: './invite.html',
  styleUrl: './invite.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthFacade);
  private readonly db = inject(SupabaseService);
  private readonly invitationService = inject(InvitationService);

  protected readonly state = signal<InviteState>('loading');
  protected readonly errorMsg = signal('');
  protected readonly leagueName = signal('');
  protected leagueId = 0;
  private token = '';
  private resolvedUserId = 0;

  // Team-name step
  protected teamNameInput = '';
  protected readonly teamNameError = signal('');

  async ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.state.set('error');
      this.errorMsg.set('Token de invitación no encontrado en la URL.');
      return;
    }

    await this.auth.waitForAuthReady();
    const userId = await this.resolveUserId();

    if (!userId) {
      const info = await this.invitationService.getLeagueFromToken(this.token);
      if (info) {
        this.leagueId = info.leagueId;
        this.leagueName.set(info.leagueName);
      }
      sessionStorage.setItem('invite_token', this.token);
      this.state.set('unauthenticated');
      return;
    }

    this.resolvedUserId = userId;

    // Fetch league info from token
    const info = await this.invitationService.getLeagueFromToken(this.token);
    if (info) {
      this.leagueId = info.leagueId;
      this.leagueName.set(info.leagueName);
    }

    // If the user is already an approved member (auto-joined when invitation was sent),
    // skip the team-name step and process the token immediately.
    if (this.leagueId) {
      const alreadyApproved = await this.invitationService.isApprovedMember(userId, this.leagueId);
      if (alreadyApproved) {
        await this.processToken(this.token, userId, '');
        return;
      }
    }

    this.state.set('set_team_name');
  }

  protected async confirmTeamName() {
    const name = this.teamNameInput.trim();
    if (!name) {
      this.teamNameError.set('El nombre del equipo es obligatorio.');
      return;
    }
    if (name.length < 2) {
      this.teamNameError.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    this.teamNameError.set('');
    await this.processToken(this.token, this.resolvedUserId, name);
  }

  private async processToken(token: string, userId: number, teamName: string) {
    this.state.set('processing');
    const result = await this.invitationService.acceptMagicLink(token, userId, teamName);
    if (result.error) {
      this.state.set('error');
      this.errorMsg.set(result.error);
    } else if (result.pendingApproval) {
      this.leagueId = result.leagueId!;
      this.state.set('pending_approval');
    } else {
      this.leagueId = result.leagueId!;
      this.state.set('success');
    }
  }

  private async resolveUserId(): Promise<number> {
    const fromClaim = Number(this.auth.getInternalUserId());
    if (fromClaim) return fromClaim;

    const email = this.auth.getEmail();
    if (!email) return 0;

    const { data } = await this.db.client
      .from('USER')
      .select('user_id')
      .eq('email', email)
      .single<{ user_id: number }>();

    return data?.user_id ?? 0;
  }

  protected goToLeague() {
    this.router.navigate(['/league', this.leagueId, 'standings']);
  }

  protected previewLeague() {
    this.router.navigate(['/league-preview', this.leagueId]);
  }

  protected goToAuth() {
    this.router.navigate(['/auth']);
  }
}
