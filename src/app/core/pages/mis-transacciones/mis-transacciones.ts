import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { SupabaseService } from '../../services/supabase-service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { WalletService } from '../wallet/wallet.service';
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
  return new Date(dateStr).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-mis-transacciones',
  standalone: true,
  imports: [ClientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-transacciones.html',
  styleUrls: ['./mis-transacciones.css'],
})
export class MisTransaccionesPage implements OnInit {
  private readonly db = inject(SupabaseService);
  private readonly auth = inject(AuthFacade);
  private readonly walletService = inject(WalletService);

  protected readonly cards = signal<ClientCardData[]>([]);
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

    const isAdmin = (this.auth.role() ?? '').toLowerCase() === 'admin';
    let query = (this.db.client as any)
      .from('TRANSACTION')
      .select(
        `
        transaction_id, amount, description, transaction_date,
        catalog:CATALOG(description)
      `,
      )
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false });

    if (!isAdmin) {
      const userId = Number(this.auth.getInternalUserId());
      if (!userId) {
        this.loading.set(false);
        return;
      }
      const { data: wallet } = await this.walletService.getWallet(userId);
      if (!wallet?.wallet_id) {
        this.loading.set(false);
        return;
      }
      query = query.eq('wallet_id', wallet.wallet_id);
    }

    const { data, error } = await query;

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
          details: [{ icon: 'pi-calendar', text: formatDate(r.transaction_date) }],
        };
      }),
    );

    this.loading.set(false);
  }
}
