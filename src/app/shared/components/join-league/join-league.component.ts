import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JoinLeagueService, LeaguePreview } from '../../../core/pages/league/join-league.service';
import { AuthFacade } from '../../features/auth/auth.facade';

type JoinStep = 'search' | 'working';

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

  // Step 1 — search
  protected searchQuery = '';
  protected readonly step = signal<JoinStep>('search');
  protected readonly errorMsg = signal('');
  protected readonly successMsg = signal('');
  protected readonly isWorking = signal(false);
  protected readonly searchResults = signal<LeaguePreview[]>([]);
  protected readonly searchMode = signal<'code' | 'name'>('code');

  // Selected league (from preview or search result)
  private selectedLeague: LeaguePreview | null = null;
  protected readonly previewLeague = signal<LeaguePreview | null>(null);

  // ── Step 1: search / preview ──────────────────────────────────────────────

  protected async search() {
    if (!this.searchQuery.trim()) {
      this.errorMsg.set(
        this.searchMode() === 'code'
          ? 'Ingresa el código de invitación.'
          : 'Ingresa el nombre de la liga.',
      );
      return;
    }
    this.isWorking.set(true);
    this.errorMsg.set('');
    this.searchResults.set([]);
    this.previewLeague.set(null);

    if (this.searchMode() === 'code') {
      const { league, error } = await this.svc.previewByCode(this.searchQuery);
      this.isWorking.set(false);
      if (error || !league) {
        this.errorMsg.set(error ?? 'Liga no encontrada.');
        return;
      }
      this.previewLeague.set(league);
    } else {
      const results = await this.svc.searchByName(this.searchQuery);
      this.isWorking.set(false);
      if (!results.length) {
        this.errorMsg.set('No se encontraron ligas con ese nombre.');
        return;
      }
      this.searchResults.set(results);
    }
  }

  protected selectLeague(league: LeaguePreview) {
    this.selectedLeague = league;
    this.previewLeague.set(league);
    this.searchResults.set([]);
  }

  protected async confirmJoin() {
    this.step.set('working');
    this.errorMsg.set('');

    const userId = Number(this.auth.getInternalUserId());
    const code = this.selectedLeague?.invitationCode ?? this.searchQuery;
    const { leagueId, error } = await this.svc.joinByCode(code, userId);

    if (error) {
      this.step.set('search');
      this.errorMsg.set(error);
      return;
    }

    this.successMsg.set(
      leagueId ? '¡Solicitud enviada! El administrador deberá aprobarla.' : '¡Te uniste a la liga!',
    );
    setTimeout(() => {
      this.closed.emit();
      this.router.navigate(['/mis-ligas']);
    }, 1400);
  }

  protected backToSearch() {
    this.step.set('search');
    this.previewLeague.set(null);
    this.selectedLeague = null;
    this.errorMsg.set('');
  }

  protected close() {
    this.closed.emit();
  }
}
