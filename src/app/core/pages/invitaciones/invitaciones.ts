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
        <h2 class="inv-title">
          <i class="pi pi-envelope"></i> Mis Invitaciones
        </h2>
        <p class="inv-subtitle">Acepta o rechaza las invitaciones a ligas que te hayan enviado.</p>
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
        gap: 1.25rem;
        padding: 1.5rem 1rem 3rem;
        max-width: 780px;
        margin: 0 auto;
      }

      .inv-header {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .inv-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--text-color, #1e293b);
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }
      .inv-title .pi {
        font-size: 1.2rem;
        color: var(--primary-color, #6366f1);
      }

      .inv-subtitle {
        margin: 0;
        color: var(--text-color-secondary, #64748b);
        font-size: 0.88rem;
      }

      .inv-card {
        border: 1px solid var(--surface-border, #e2e8f0);
        border-radius: 0.75rem;
        background: var(--surface-card, #fff);
        padding: 1rem 1.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitacionesPage {}
