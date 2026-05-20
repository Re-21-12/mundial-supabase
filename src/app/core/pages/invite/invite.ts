import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { InvitationService } from '../../services/invitation.service';
import { SupabaseService } from '../../services/supabase-service';

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
  private readonly db = inject(SupabaseService);
  private readonly invitationService = inject(InvitationService);

  protected readonly state = signal<InviteState>('loading');
  protected readonly errorMsg = signal('');
  protected readonly leagueName = signal('');
  protected leagueId = 0;
  private token = '';

  async ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.state.set('error');
      this.errorMsg.set('Token de invitación no encontrado en la URL.');
      return;
    }

    // Wait for Supabase auth to fully resolve before reading user state
    await this.auth.waitForAuthReady();

    const userId = await this.resolveUserId();

    if (!userId) {
      // Truly unauthenticated — show invite card with league info
      const info = await this.invitationService.getLeagueFromToken(this.token);
      if (info) {
        this.leagueId = info.leagueId;
        this.leagueName.set(info.leagueName);
      }
      sessionStorage.setItem('invite_token', this.token);
      this.state.set('unauthenticated');
      return;
    }

    await this.processToken(this.token, userId);
  }

  /**
   * Returns the internal USER.user_id.
   * First reads from the JWT custom claim (already in memory).
   * If missing (e.g. first login after registration before token refresh),
   * falls back to a DB lookup by auth email.
   */
  private async resolveUserId(): Promise<number> {
    const fromClaim = Number(this.auth.getInternalUserId());
    if (fromClaim) return fromClaim;

    // Claim not present — look up by email (anon users have no email)
    const email = this.auth.getEmail();
    if (!email) return 0;

    const { data } = await this.db.client
      .from('USER')
      .select('user_id')
      .eq('email', email)
      .single<{ user_id: number }>();

    return data?.user_id ?? 0;
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

  protected previewLeague() {
    this.router.navigate(['/league-preview', this.leagueId]);
  }

  protected goToAuth() {
    this.router.navigate(['/auth']);
  }
}
