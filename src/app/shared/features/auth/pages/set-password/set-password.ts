import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../auth.facade';

@Component({
  selector: 'app-set-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './set-password.html',
  styleUrl: './set-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected get passwordsMismatch(): boolean {
    const value = this.form.getRawValue();
    return (
      Boolean(value.newPassword) &&
      Boolean(value.confirmPassword) &&
      value.newPassword !== value.confirmPassword
    );
  }

  protected async onSubmit() {
    if (this.form.invalid || this.passwordsMismatch || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    try {
      const { newPassword } = this.form.getRawValue();
      await this.authFacade.setNewPassword(newPassword);
      this.successMessage.set('Password actualizada correctamente.');
      await this.router.navigate(['/home']);
    } catch {
      this.errorMessage.set(
        'No se pudo actualizar la password. Verifica tu enlace e intenta de nuevo.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
