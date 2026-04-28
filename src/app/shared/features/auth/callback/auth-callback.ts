import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../auth.facade';

@Component({
  selector: 'app-auth-callback',
  template: `
    <section class="callback-shell" aria-live="polite" aria-busy="true">
      <div class="callback-card">
        <h1>Validando acceso</h1>
        <p>Estamos completando tu autenticacion. Seras redirigido en unos segundos.</p>
      </div>
    </section>
  `,
  styles: [
    `
      .callback-shell {
        min-height: 60vh;
        display: grid;
        place-items: center;
        padding: 1.25rem;
      }

      .callback-card {
        width: min(520px, 100%);
        border: 1px solid #cbd5e1;
        border-radius: 0.75rem;
        background: #f8fafc;
        padding: 1.25rem;
      }

      .callback-card h1 {
        margin: 0;
        font-size: 1.25rem;
        color: #0f172a;
      }

      .callback-card p {
        margin: 0.6rem 0 0;
        color: #334155;
      }
    `,
  ],
})
export class AuthCallback implements OnInit {
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.resolveSession();
  }

  private async resolveSession(): Promise<void> {
    try {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search.replace(/^\?/, ''));
      const callbackType = hashParams.get('type');
      const error = hashParams.get('error') ?? queryParams.get('error');
      const errorDescription =
        hashParams.get('error_description') ?? queryParams.get('error_description') ?? '';
      const { data } = await this.auth.getSession();

      if (error === 'access_denied') {
        await this.router.navigate(['/auth'], {
          queryParams: {
            error: 'access_denied',
            error_description: errorDescription,
          },
          fragment: 'error=access_denied&sb=',
          replaceUrl: true,
        });
        return;
      }

      if (callbackType === 'recovery' && data.session) {
        await this.router.navigate(['/auth'], {
          queryParams: { mode: 'update-password' },
          replaceUrl: true,
        });
        return;
      }

      if (data.session) {
        await this.router.navigate(['/home']);
        return;
      }

      await this.router.navigate(['/login']);
    } catch (error) {
      await this.router.navigate(['/login']);
    }
  }
}
