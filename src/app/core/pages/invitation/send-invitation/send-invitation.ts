import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { InvitationService, InvitationType } from '../../../../shared/components/notification-inbox/invitation.service';
import { SupabaseService } from '../../../services/supabase-service';

@Component({
  selector: 'app-send-invitation',
  imports: [ReactiveFormsModule],
  templateUrl: './send-invitation.html',
  styleUrl: './send-invitation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendInvitationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly invitationService = inject(InvitationService);
  private readonly authFacade = inject(AuthFacade);
  private readonly db = inject(SupabaseService);

  readonly leagueId = input<number>(0);

  protected readonly isSending = signal(false);
  protected readonly successToken = signal<string | null>(null);
  protected readonly emailSent = signal<boolean | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly copied = signal(false);
  /** URL directa para que el invitado se una sin token de email */
  protected readonly joinUrl = signal<string | null>(null);
  protected readonly copiedUrl = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    leagueId: [0, [Validators.required, Validators.min(1)]],
    type: ['existing' as InvitationType, Validators.required],
  });

  async ngOnInit() {
    const id = this.leagueId();
    if (id > 0) {
      this.form.controls.leagueId.setValue(id);
      this.form.controls.leagueId.disable();
      await this._loadJoinUrl(id);
    }
  }

  private async _loadJoinUrl(leagueId: number): Promise<void> {
    const { data } = await this.db.client
      .from('LEAGUE')
      .select('invitation_code')
      .eq('league_id', leagueId)
      .maybeSingle();

    const code = (data as any)?.invitation_code;
    if (code) {
      this.joinUrl.set(`${window.location.origin}/join?code=${code}`);
    }
  }

  protected async onSubmit() {
    if (this.form.invalid || this.isSending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set('');
    this.successToken.set(null);
    this.emailSent.set(null);
    this.copied.set(false);

    try {
      const { email, type } = this.form.getRawValue();
      const leagueId = this.form.controls.leagueId.value;
      const inviterId = Number(this.authFacade.getInternalUserId());

      const result = type === 'existing'
        ? await this.invitationService.sendToExistingUser(email, leagueId, inviterId)
        : await this.invitationService.sendToAnonymous(email, leagueId, inviterId);

      if (!result.success) {
        this.errorMessage.set(result.error ?? 'Error al enviar la invitación.');
      } else {
        this.successToken.set(result.token ?? null);
        this.emailSent.set(result.emailSent ?? null);
        this.form.reset({ email: '', leagueId: this.leagueId() > 0 ? this.leagueId() : 0, type: 'existing' });
        if (this.leagueId() > 0) this.form.controls.leagueId.disable();
      }
    } catch (err) {
      console.error('[SendInvitation] onSubmit error:', err);
      this.errorMessage.set('Error inesperado al enviar la invitación.');
    } finally {
      this.isSending.set(false);
    }
  }

  protected async copyToken() {
    const token = this.successToken();
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  protected async copyJoinUrl() {
    const url = this.joinUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.copiedUrl.set(true);
      setTimeout(() => this.copiedUrl.set(false), 2000);
    } catch {
      // clipboard not available
    }
  }
}
