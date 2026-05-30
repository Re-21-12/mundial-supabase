import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthFacade } from '../../features/auth/auth.facade';
import { LeagueCreationService } from '../../../core/pages/league/league-creation.service';
import { NotificationService } from '../../services/notification-service';

@Component({
  selector: 'app-create-league-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule],
  templateUrl: './create-league-dialog.html',
  styleUrl: './create-league-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateLeagueDialogComponent {
  private readonly auth = inject(AuthFacade);
  private readonly leagueSvc = inject(LeagueCreationService);
  private readonly notif = inject(NotificationService);

  readonly created = output<number>();
  readonly cancelled = output<void>();

  protected readonly submitting = signal(false);
  protected readonly name = signal('');
  protected readonly leagueType = signal<'diversión' | 'apuesta'>('diversión');
  protected readonly entryPrice = signal<number | null>(null);

  protected get isApuesta() {
    return this.leagueType() === 'apuesta';
  }

  protected get isValid(): boolean {
    const n = this.name().trim();
    if (!n) return false;
    if (this.isApuesta) {
      const p = this.entryPrice();
      return p !== null && p > 0;
    }
    return true;
  }

  protected async submit(): Promise<void> {
    if (!this.isValid || this.submitting()) return;
    const userId = Number(this.auth.getInternalUserId());
    if (!userId) {
      this.notif.notify('error', 'Error', 'Debes iniciar sesión.');
      return;
    }

    this.submitting.set(true);
    const result = await this.leagueSvc.createLeague({
      name: this.name().trim(),
      leagueType: this.leagueType(),
      entryPrice: this.isApuesta ? (this.entryPrice() ?? 0) : undefined,
      createdBy: userId,
    });
    this.submitting.set(false);

    if (!result.success || !result.leagueId) {
      this.notif.notify('error', 'No se pudo crear la liga', result.error ?? '');
      return;
    }

    this.notif.notify('success', '¡Liga creada!', `"${this.name().trim()}" está lista.`);
    this.created.emit(result.leagueId);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
