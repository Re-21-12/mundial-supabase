import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JoinLeagueService, LeaguePreview } from '../../../core/pages/league/join-league.service';
import { AuthFacade } from '../../features/auth/auth.facade';

type JoinStep = 'search' | 'team_name' | 'working';

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

  // Step 2 — team name
  protected teamName = '';
  protected readonly teamNameError = signal('');

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

  protected proceedToTeamName() {
    this.selectedLeague = this.previewLeague();
    this.teamName = '';
    this.teamNameError.set('');
    this.step.set('team_name');
  }

  // ── Step 2: team name ─────────────────────────────────────────────────────

  protected async confirmJoin() {
    const name = this.teamName.trim();
    if (!name) {
      this.teamNameError.set('El nombre del equipo es obligatorio.');
      return;
    }
    if (name.length < 2) {
      this.teamNameError.set('Debe tener al menos 2 caracteres.');
      return;
    }

    this.teamNameError.set('');
    this.step.set('working');
    this.errorMsg.set('');

    const userId = Number(this.auth.getInternalUserId());
    const code = this.selectedLeague?.invitationCode ?? this.searchQuery;
    const { leagueId, error } = await this.svc.joinByCode(code, userId, name);

    if (error) {
      this.step.set('team_name');
      this.errorMsg.set(error);
      return;
    }

    this.successMsg.set(
      leagueId ? '¡Solicitud enviada! El administrador deberá aprobarla.' : '¡Te uniste a la liga!',
    );
    setTimeout(() => {
      this.closed.emit();
      if (leagueId) this.router.navigate(['/league-preview', leagueId]);
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
