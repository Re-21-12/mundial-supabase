import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { AuthFacade } from '../../features/auth/auth.facade';
import { LeagueCreationService } from '../../../core/pages/league/league-creation.service';
import { NotificationService } from '../../services/notification-service';
import { DynamicForm } from '../../features/dynamic-form/dynamic-form';
import { formFields } from '../../features/dynamic-form/utils/forms';

@Component({
  selector: 'app-create-league-dialog',
  standalone: true,
  imports: [DynamicForm],
  templateUrl: './create-league-dialog.html',
  styleUrl: './create-league-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateLeagueDialogComponent {
  private readonly auth      = inject(AuthFacade);
  private readonly leagueSvc = inject(LeagueCreationService);
  private readonly notif     = inject(NotificationService);

  readonly created   = output<number>();
  readonly cancelled = output<void>();

  protected readonly submitting = signal(false);
  protected readonly fields = formFields['leagueCreationForm'].fields;

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected async onFormData(jsonData: string): Promise<void> {
    if (this.submitting()) return;

    const data = JSON.parse(jsonData) as {
      name: string;
      catalog_id: number;
      buy_in_amount: number;
    };

    const userId = Number(this.auth.getInternalUserId());
    if (!userId) {
      this.notif.notify('error', 'Error', 'Debes iniciar sesión.');
      return;
    }

    this.submitting.set(true);
    const result = await this.leagueSvc.createLeague({
      name:        data.name,
      catalogId:   Number(data.catalog_id),
      buyInAmount: Number(data.buy_in_amount ?? 0),
      createdBy:   userId,
    });
    this.submitting.set(false);

    if (!result.success || !result.leagueId) {
      this.notif.notify('error', 'No se pudo crear la liga', result.error ?? '');
      return;
    }

    this.notif.notify('success', '¡Liga creada!', `"${data.name.trim()}" está lista.`);
    this.created.emit(result.leagueId);
  }
}
