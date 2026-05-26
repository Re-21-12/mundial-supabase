import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import {
  ClientCardComponent,
  type ClientCardData,
} from '../../../shared/components/client-card/client-card';

interface TxRow {
  transaction_id: number;
  amount: number;
  description: string | null;
  transaction_date: string | null;
  catalog: { description: string } | null;
}

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

@Component({
  selector: 'app-mis-transacciones',
  standalone: true,
  imports: [ClientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-page">
      <div class="mt-header">
        <h2 class="mt-title">
          <i class="pi pi-wallet"></i>
          Mis Transacciones
        </h2>
        <div class="mt-summary" [class.mt-summary--pos]="balance() >= 0" [class.mt-summary--neg]="balance() < 0">
          <span class="mt-summary-label">Balance</span>
          <span class="mt-summary-value">{{ formatAmount(balance()) }}</span>
        </div>
      </div>

      @if (loading()) {
        <div class="mt-grid">
          @for (n of [1,2,3,4,5,6]; track n) {
            <div class="mt-skeleton"></div>
          }
        </div>
      } @else if (cards().length === 0) {
        <div class="mt-empty">
          <i class="pi pi-wallet"></i>
          <p>Sin movimientos registrados.</p>
        </div>
      } @else {
        <div class="mt-grid">
          @for (card of cards(); track card.id) {
            <app-client-card [card]="card" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .mt-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .mt-header {
      display: flex; align-items: center;
      justify-content: space-between; flex-wrap: wrap; gap: 1rem;
    }
    .mt-title {
      font-size: 1.25rem; font-weight: 700;
      display: flex; align-items: center; gap: .5rem; margin: 0;
    }
    .mt-summary {
      display: flex; flex-direction: column; align-items: flex-end;
      padding: 8px 16px; border-radius: 12px;
      background: var(--muted); border: 1px solid var(--border);
    }
    .mt-summary-label { font-size: .65rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted-foreground); }
    .mt-summary-value { font-size: 1.2rem; font-weight: 800; }
    .mt-summary--pos .mt-summary-value { color: oklch(0.55 0.16 148); }
    .mt-summary--neg .mt-summary-value { color: var(--destructive); }
    .mt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .mt-skeleton {
      height: 200px; border-radius: 20px;
      background: var(--card); animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
    .mt-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: .75rem; min-height: 200px;
      color: var(--muted-foreground); font-size: .95rem;
    }
    .mt-empty .pi { font-size: 2rem; }
  `],
})
export class MisTransaccionesPage implements OnInit {
  private readonly db = inject(SupabaseService);

  protected readonly cards   = signal<ClientCardData[]>([]);
  protected readonly loading = signal(true);
  protected readonly formatAmount = formatAmount;

  protected readonly balance = computed(() =>
    this.cards().reduce((sum, c) => {
      const raw = typeof c.metric?.value === 'number' ? c.metric.value : 0;
      return sum + raw;
    }, 0),
  );

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    this.loading.set(true);

    const { data, error } = await (this.db.client as any)
      .from('TRANSACTION')
      .select(`
        transaction_id, amount, description, transaction_date,
        catalog:CATALOG(description)
      `)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('[MisTransacciones] load error:', error);
      this.loading.set(false);
      return;
    }

    const rows: TxRow[] = data ?? [];

    this.cards.set(
      rows.map((r): ClientCardData => {
        const isPositive = r.amount >= 0;
        return {
          id: r.transaction_id,
          title: r.catalog?.description ?? 'Movimiento',
          subtitle: r.description ?? null,
          tag: {
            label: isPositive ? 'Crédito' : 'Débito',
            type: isPositive ? 'success' : 'danger',
          },
          metric: { value: r.amount, label: formatAmount(r.amount) },
          details: [
            { icon: 'pi-calendar', text: formatDate(r.transaction_date) },
          ],
        };
      }),
    );

    this.loading.set(false);
  }
}
