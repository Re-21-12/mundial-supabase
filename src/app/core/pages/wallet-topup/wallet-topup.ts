import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { WalletService, WalletSummary } from '../../services/wallet.service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { SupabaseService } from '../../services/supabase-service';

interface CatalogOption {
  catalog_id: number;
  description: string;
}

const PAYMENT_METHODS = [
  { key: 'card', label: 'Tarjeta de crédito / débito' },
  { key: 'oxxo', label: 'OXXO Pay' },
  { key: 'transfer', label: 'Transferencia bancaria' },
  { key: 'paypal', label: 'PayPal' },
];

@Component({
  selector: 'app-wallet-topup',
  imports: [FormsModule, ButtonModule],
  templateUrl: './wallet-topup.html',
  styleUrl: './wallet-topup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletTopupPage implements OnInit {
  private readonly walletSvc = inject(WalletService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly db = inject(SupabaseService);

  protected readonly wallet = signal<WalletSummary | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly successMsg = signal('');
  protected readonly errorMsg = signal('');

  protected readonly depositCatalogOptions = signal<CatalogOption[]>([]);
  protected readonly paymentMethods = PAYMENT_METHODS;

  protected amount = 0;
  protected selectedPaymentMethod = PAYMENT_METHODS[0].key;
  protected selectedCatalogId = 0;

  private userId = 0;

  async ngOnInit() {
    this.userId = Number(this.auth.getInternalUserId());
    if (!this.userId) { this.router.navigate(['/home']); return; }

    const [walletRes, catalogRes] = await Promise.all([
      this.walletSvc.getWallet(this.userId),
      this.db.client
        .from('CATALOG')
        .select('catalog_id, description')
        .eq('table_id', 40)
        .eq('table_name', 'transaction_type')
        .eq('is_deleted', false)
        .order('description'),
    ]);

    this.wallet.set(walletRes.data ?? null);

    const depositEntry = ((catalogRes.data ?? []) as CatalogOption[]).find(
      (c) => c.description.toLowerCase().includes('depósito') || c.description.toLowerCase().includes('deposito'),
    );
    if (depositEntry) this.selectedCatalogId = depositEntry.catalog_id;
    this.depositCatalogOptions.set((catalogRes.data ?? []) as CatalogOption[]);

    this.isLoading.set(false);
  }

  protected async submit() {
    this.errorMsg.set('');
    this.successMsg.set('');

    if (!this.amount || this.amount < 50) {
      this.errorMsg.set('El monto mínimo de recarga es $50.');
      return;
    }

    const w = this.wallet();
    if (!w) { this.errorMsg.set('No se encontró tu wallet.'); return; }

    if (!this.selectedCatalogId) {
      this.errorMsg.set('Selecciona un tipo de transacción.');
      return;
    }

    this.isSubmitting.set(true);

    const paymentLabel = this.paymentMethods.find((p) => p.key === this.selectedPaymentMethod)?.label ?? '';
    const desc = `Recarga vía ${paymentLabel} — $${this.amount}`;

    const { error } = await this.walletSvc.deposit(w.wallet_id, this.userId, this.amount, this.selectedCatalogId, desc);

    this.isSubmitting.set(false);

    if (error) {
      this.errorMsg.set('Error al procesar el depósito: ' + error);
    } else {
      const updated = { ...w, balance: w.balance + this.amount };
      this.wallet.set(updated);
      this.successMsg.set(`¡Recarga exitosa! Se añadieron $${this.amount} a tu saldo.`);
      this.amount = 0;
    }
  }

  protected goBack() { this.router.navigate(['/home']); }
}
