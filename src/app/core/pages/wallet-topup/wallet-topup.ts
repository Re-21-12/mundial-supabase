import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService, WalletSummary } from '../../services/wallet.service';
import { AuthFacade } from '../../../shared/features/auth/auth.facade';
import { SupabaseService } from '../../services/supabase-service';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { FieldBase } from '../../../shared/features/dynamic-form/interfaces/field-props';
import { TypeFields } from '../../../shared/features/dynamic-form/enums/type-fields';

interface CatalogItem {
  catalog_id: number;
  description: string;
}

const PAYMENT_METHODS = [
  { key: 'card',     label: 'Tarjeta de crédito / débito' },
  { key: 'oxxo',     label: 'OXXO Pay' },
  { key: 'transfer', label: 'Transferencia bancaria' },
  { key: 'paypal',   label: 'PayPal' },
];

const DEFAULT_STATE = {
  required: true, disabled: false, hidden: false, readonly: false,
  repeatible: { repeat: false, minItems: 0, maxItems: 1 },
};

@Component({
  selector: 'app-wallet-topup',
  imports: [DecimalPipe, DynamicForm],
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

  protected readonly walletFields = signal<FieldBase<any>[]>([]);
  /** Patched into DynamicForm on preset clicks — patchValue only updates the provided keys */
  protected readonly formPatch = signal<Record<string, any> | null>(null);
  protected readonly activePreset = signal<number | null>(null);

  readonly presets = [100, 200, 500, 1000];
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

    const items = (catalogRes.data ?? []) as CatalogItem[];
    const depositEntry = items.find(
      (c) => c.description.toLowerCase().includes('depósito') || c.description.toLowerCase().includes('deposito'),
    ) ?? items[0];

    this.walletFields.set(this.buildFields(items, depositEntry?.catalog_id ?? 0));
    this.isLoading.set(false);
  }

  private buildFields(items: CatalogItem[], defaultTxId: number): FieldBase<any>[] {
    const fields: FieldBase<any>[] = [
      {
        icon: 'pi pi-money-bill', key: 'amount',
        type: TypeFields.NUMBER, controlType: TypeFields.NUMBER,
        label: 'Monto a cargar (GTQ)', placeholder: '0',
        hint: 'Monto mínimo: Q50', value: 0,
        rules: [Validators.required, Validators.min(50)],
        options: [], state: DEFAULT_STATE, order: 1,
      },
      {
        icon: 'pi pi-credit-card', key: 'paymentMethod',
        type: TypeFields.SELECT, controlType: TypeFields.SELECT,
        label: 'Método de pago', placeholder: 'Selecciona un método',
        hint: 'Simulado — sin cargo real.', value: 'card',
        rules: [Validators.required],
        options: PAYMENT_METHODS.map((m) => ({ key: m.key, value: m.label })),
        state: DEFAULT_STATE, order: 2,
      },
    ];

    if (items.length > 0) {
      fields.push({
        icon: 'pi pi-tag', key: 'txType',
        type: TypeFields.SELECT, controlType: TypeFields.SELECT,
        label: 'Tipo de transacción', placeholder: 'Selecciona un tipo',
        hint: '', value: defaultTxId || items[0].catalog_id,
        rules: [Validators.required],
        options: items.map((c) => ({ key: c.catalog_id, value: c.description })),
        // Hide when there's only one option — auto-selected via default value
        state: items.length === 1 ? { ...DEFAULT_STATE, hidden: true } : DEFAULT_STATE,
        order: 3,
      });
    }

    return fields;
  }

  protected selectPreset(preset: number) {
    this.activePreset.set(preset);
    // Only patches `amount`; DynamicForm's patchValue leaves paymentMethod / txType untouched
    this.formPatch.set({ amount: preset });
  }

  protected async onFormSubmit(payload: string) {
    if (this.isSubmitting()) return;
    this.errorMsg.set('');
    this.successMsg.set('');

    const { amount, paymentMethod, txType } = JSON.parse(payload) as {
      amount: number; paymentMethod: string; txType: number;
    };

    const w = this.wallet();
    if (!w) { this.errorMsg.set('No se encontró tu wallet.'); return; }

    this.isSubmitting.set(true);
    const paymentLabel = PAYMENT_METHODS.find((p) => p.key === paymentMethod)?.label ?? paymentMethod;
    const desc = `Recarga vía ${paymentLabel} — Q${amount}`;

    const { error } = await this.walletSvc.deposit(w.wallet_id, this.userId, amount, Number(txType), desc);
    this.isSubmitting.set(false);

    if (error) {
      this.errorMsg.set('Error al procesar el depósito: ' + error);
    } else {
      this.wallet.set({ ...w, balance: w.balance + amount });
      this.successMsg.set(`¡Recarga exitosa! Se añadieron Q${amount} a tu saldo.`);
      this.activePreset.set(null);
      this.formPatch.set({ amount: 0 });
    }
  }

  protected goBack() { this.router.navigate(['/home']); }
}
