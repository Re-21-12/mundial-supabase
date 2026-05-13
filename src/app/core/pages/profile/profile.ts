import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { ProfileService, UserProfileData, WalletData } from '../../services/profile.service';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  protected readonly authFacade = inject(AuthFacade);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly profile = signal<UserProfileData | null>(null);
  protected readonly wallet = signal<WalletData | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    login: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
  });

  protected get initials(): string {
    const name = this.profile()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  }

  async ngOnInit() {
    const userId = Number(this.authFacade.getInternalUserId());
    if (!userId) {
      this.errorMessage.set('No se pudo identificar al usuario.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [profileResult, walletResult] = await Promise.all([
        this.profileService.loadProfile(userId),
        this.profileService.loadWallet(userId),
      ]);

      if (profileResult.error) {
        this.errorMessage.set('No se pudo cargar el perfil.');
        return;
      }

      this.profile.set(profileResult.data);
      this.wallet.set(walletResult.data ?? null);

      this.form.setValue({
        name: profileResult.data?.name ?? '',
        login: profileResult.data?.login ?? '',
      });
    } catch {
      this.errorMessage.set('Error inesperado al cargar el perfil.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onSubmit() {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = Number(this.authFacade.getInternalUserId());
    if (!userId) return;

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const { data, error } = await this.profileService.updateProfile(userId, this.form.getRawValue());
      if (error) {
        this.errorMessage.set('No se pudo guardar. Intenta nuevamente.');
        return;
      }
      this.profile.set(data);
      this.successMessage.set('Perfil actualizado correctamente.');
    } catch {
      this.errorMessage.set('Error inesperado al guardar.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
