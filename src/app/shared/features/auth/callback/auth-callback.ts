import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../auth.facade';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.html',
  styleUrls: ['./auth-callback.css'],
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
      const error = hashParams.get('error') ?? queryParams.get('error');
      const errorDescription =
        hashParams.get('error_description') ?? queryParams.get('error_description') ?? '';

      if (error === 'access_denied') {
        await this.router.navigate(['/auth'], {
          queryParams: { error: 'access_denied', error_description: errorDescription },
          replaceUrl: true,
        });
        return;
      }

      // Wait for Supabase to complete the PKCE code exchange before reading session
      await this.auth.waitForAuthReady(8000);

      const callbackType = hashParams.get('type');
      const { data } = await this.auth.getSession();

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
    } catch {
      await this.router.navigate(['/login']);
    }
  }
}
