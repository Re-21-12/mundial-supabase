import {
  ChangeDetectionStrategy, Component, inject, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JoinLeagueService } from '../../../core/services/join-league.service';
import { AuthFacade } from '../../features/auth/auth.facade';

@Component({
  selector: 'app-join-league',
  imports: [FormsModule],
  templateUrl: './join-league.component.html',
  styleUrl: './join-league.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinLeagueComponent {
  private readonly svc = inject(JoinLeagueService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly closed = output<void>();

  protected code = '';
  protected readonly isWorking = signal(false);
  protected readonly errorMsg = signal('');
  protected readonly successMsg = signal('');

  protected async submit() {
    if (!this.code.trim()) { this.errorMsg.set('Ingresa el código de invitación.'); return; }
    this.isWorking.set(true);
    this.errorMsg.set('');

    const userId = Number(this.auth.getInternalUserId());
    const { leagueId, error } = await this.svc.joinByCode(this.code, userId);

    this.isWorking.set(false);
    if (error) { this.errorMsg.set(error); return; }

    this.successMsg.set('¡Te uniste a la liga correctamente!');
    setTimeout(() => {
      this.closed.emit();
      this.router.navigate(['/league', leagueId]);
    }, 1200);
  }

  protected close() { this.closed.emit(); }
}
