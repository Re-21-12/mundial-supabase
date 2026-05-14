import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { InvitationService, InvitationType } from '../../../services/invitation.service';

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

  readonly leagueId = input<number>(0);

  protected readonly isSending = signal(false);
  protected readonly successToken = signal<string | null>(null);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    leagueId: [0, [Validators.required, Validators.min(1)]],
    type: ['existing' as InvitationType, Validators.required],
  });

  ngOnInit() {
    const id = this.leagueId();
    if (id > 0) {
      this.form.controls.leagueId.setValue(id);
      this.form.controls.leagueId.disable();
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
      this.form.reset({ email: '', leagueId: this.leagueId() > 0 ? this.leagueId() : 0, type: 'existing' });
      if (this.leagueId() > 0) this.form.controls.leagueId.disable();
    }

    this.isSending.set(false);
  }
}
