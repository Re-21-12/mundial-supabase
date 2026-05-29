import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyInvitationsComponent } from '../../../shared/components/my-invitations/my-invitations.component';

@Component({
  selector: 'app-invitaciones',
  standalone: true,
  imports: [CommonModule, MyInvitationsComponent],
  template: `
    <div class="inv-page">
      <header class="inv-header">
        <h2 class="inv-title">Mis Invitaciones</h2>
        <p class="inv-subtitle">Acepta o rechaza las invitaciones pendientes desde aquí.</p>
      </header>

      <section class="inv-card">
        <app-my-invitations />
      </section>
    </div>
  `,
  styles: [
    `
      .inv-page {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
        max-width: 980px;
        margin: 0 auto;
      }

      .inv-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .inv-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--foreground);
      }

      .inv-subtitle {
        margin: 0;
        color: var(--muted-foreground);
        font-size: 0.92rem;
      }

      .inv-card {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        background: var(--card);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitacionesPage {}
