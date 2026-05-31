import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { JoinLeagueService, LeaguePreview } from '../join-league.service';
import { NotificationService } from '../../../../shared/services/notification-service';
import { SupabaseService } from '../../../services/supabase-service';

type JoinStatus = 'loading' | 'preview' | 'joining' | 'success' | 'pending' | 'error' | 'already';

@Component({
  selector: 'app-join-by-code',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './join-by-code.html',
  styleUrl: './join-by-code.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinByCodePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthFacade);
  private readonly joinSvc = inject(JoinLeagueService);
  private readonly notif = inject(NotificationService);
  private readonly db = inject(SupabaseService);

  protected readonly status = signal<JoinStatus>('loading');
  protected readonly league = signal<LeaguePreview | null>(null);
  protected readonly errorMsg = signal('');
  protected readonly joinedLeagueId = signal<number | null>(null);

  private code = '';

  async ngOnInit(): Promise<void> {
    this.code = this.route.snapshot.queryParamMap.get('code') ?? '';

    if (!this.code) {
      this.errorMsg.set('No se proporcionó código de invitación.');
      this.status.set('error');
      return;
    }

    // Si no está autenticado → guardar el código y redirigir al login
    if (!this.auth.isLoggedIn()) {
      sessionStorage.setItem('join_pending_code', this.code);
      await this.router.navigate(['/auth'], {
        queryParams: { returnUrl: `/join?code=${this.code}` },
      });
      return;
    }

    // Preview de la liga
    const preview = await this.joinSvc.previewByCode(this.code);
    if (preview.error || !preview.league) {
      this.errorMsg.set(preview.error ?? 'Liga no encontrada. Verifica el código.');
      this.status.set('error');
      return;
    }

    this.league.set(preview.league);
    this.status.set('preview');
  }

  protected async onJoin(): Promise<void> {
    const league = this.league();
    if (!league || this.status() === 'joining') return;

    const userId = Number(this.auth.getInternalUserId());
    if (!userId) {
      this.errorMsg.set('No se pudo identificar tu cuenta. Inicia sesión nuevamente.');
      this.status.set('error');
      return;
    }

    this.status.set('joining');
    const result = await this.joinSvc.joinByCode(this.code, userId);

    if (result.error) {
      // "ya eres miembro" → redirigir directamente
      if (result.error.toLowerCase().includes('ya eres miembro')) {
        this.status.set('already');
        this.joinedLeagueId.set(league.leagueId);
        return;
      }
      this.errorMsg.set(result.error);
      this.status.set('error');
      return;
    }

    const leagueId = result.leagueId!;
    this.joinedLeagueId.set(leagueId);

    if (result.pendingApproval) {
      this.status.set('pending');
      this.notif.notify(
        'info',
        'Solicitud enviada',
        `Tu solicitud para unirte a "${league.name}" está pendiente de aprobación.`,
      );
      await this._notifyOwner(userId, leagueId, league.name);
    } else {
      this.status.set('success');
      this.notif.notify('success', '¡Bienvenido!', `Ingresaste a "${league.name}" exitosamente.`);
      setTimeout(() => {
        void this.router.navigate(['/league', leagueId, 'standings']);
      }, 1800);
    }
  }

  private async _notifyOwner(
    joiningUserId: number,
    leagueId: number,
    leagueName: string,
  ): Promise<void> {
    try {
      // Obtener el dueño de la liga
      const { data: leagueData } = await this.db.client
        .from('LEAGUE')
        .select('user_id')
        .eq('league_id', leagueId)
        .maybeSingle();

      const ownerId = (leagueData as any)?.user_id;
      if (!ownerId) return;

      // Nombre del usuario que se une
      const { data: userData } = await this.db.client
        .from('USER')
        .select('name, email')
        .eq('user_id', joiningUserId)
        .maybeSingle();

      const userName =
        (userData as any)?.name ??
        (userData as any)?.email ??
        `Usuario ${joiningUserId}`;

      await this.db.client.from('NOTIFICATION_INBOX').insert({
        user_id: ownerId,
        league_id: leagueId,
        notification_type: 'league_join_request',
        title: 'Solicitud de ingreso',
        body: `${userName} quiere unirse a "${leagueName}". Revisa las aprobaciones.`,
        icon: 'pi pi-user-plus',
        action_url: `/league/${leagueId}/approvals`,
        priority: 'high',
        is_read: false,
        created_by: joiningUserId,
      });
    } catch (err) {
      console.warn('[JoinByCode] _notifyOwner failed:', err);
    }
  }
}
