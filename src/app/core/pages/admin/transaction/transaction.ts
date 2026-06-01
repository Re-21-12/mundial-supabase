import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { PostgrestError } from '@supabase/supabase-js';

import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { DynamicForm } from '../../../../shared/features/dynamic-form/dynamic-form';
import { FieldBase } from '../../../../shared/features/dynamic-form/interfaces/field-props';
import { ConfirmDeleteModalComponent } from '../../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { Database } from '../../../../types/database.types';
import { DynamicQueryFilter } from '../../../interfaces/dynamic-query-interface';
import { DynamicService } from '../../../services/dynamic-service';
import { SupabaseService } from '../../../services/supabase-service';
import { WalletService } from '../wallet/wallet.service';
import { DynamicTableService } from '../../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DynamicTable } from '../../../../shared/features/dynamic-table/dynamic-table';
import { Overlay } from '../../../../shared/layouts/overlay/overlay';
import { formFields } from '../../../../shared/features/dynamic-form/utils/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { NotificationService } from '../../../../shared/services/notification-service';

interface TransactionTypeOption {
  label: string;
  value: number | null;
}

@Component({
  selector: 'app-transaction',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DatePickerModule,
    TooltipModule,
    DynamicForm,
    DynamicTable,
  ],
  templateUrl: './transaction.html',
  styleUrl: './transaction.css',
  providers: [DialogService, DynamicTableService],
})
export class TransactionPage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['TRANSACTION'][] = [];

  fields = formFields['transactionForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  private readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  private readonly dialogService = inject(DialogService);
  private readonly walletService = inject(WalletService);
  private readonly auth = inject(AuthFacade);
  private readonly supabase = inject(SupabaseService);

  protected readonly wallet = signal<{ wallet_id: number; balance: number } | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly showDetailDialog = signal(false);
  protected readonly selectedTransaction = signal<Record<string, any> | null>(null);
  protected readonly transactionFields = signal<FieldBase<any>[]>([]);
  protected readonly transactionTypeOptions = signal<TransactionTypeOption[]>([
    { label: 'Todos', value: null },
  ]);
  protected readonly filters = signal({
    fromDate: null as Date | null,
    toDate: null as Date | null,
    catalogId: null as number | null,
    description: '',
  });

  protected readonly presets = [7, 30, 90, 180];
  protected readonly pageSummary = computed(() => {
    const totalRecords = this.tableService.tableProps().totalRecords ?? 0;
    const pageSize = this.tableService.getPageSize();
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    return {
      currentPage: this.tableService.getCurrentPage() + 1,
      totalPages,
      totalRecords,
    };
  });

  protected readonly activeFilterSummary = computed(() => {
    const { fromDate, toDate, catalogId, description } = this.filters();
    const summary: string[] = [];

    if (fromDate || toDate) {
      const dateFormatter = new Intl.DateTimeFormat('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const fromLabel = fromDate ? dateFormatter.format(fromDate) : 'Inicio';
      const toLabel = toDate ? dateFormatter.format(toDate) : 'Hoy';
      summary.push(`${fromLabel} - ${toLabel}`);
    }

    if (catalogId !== null) {
      summary.push(this.getDisplayCatalogLabel(catalogId));
    }

    if (description.trim()) {
      summary.push(`"${description.trim()}"`);
    }

    return summary.length ? summary.join(' · ') : 'Sin filtros aplicados';
  });

  async ngOnInit(): Promise<void> {
    const isAdmin = (this.auth.role() ?? '').toLowerCase() === 'admin';

    this.tableService.initTable({
      header: 'Transaction',
      columns: [
        { field: 'amount', header: 'Amount' },
        {
          field: 'catalog_id',
          header: 'Tipo',
          optionsSource: {
            table: 'CATALOG',
            valueField: 'catalog_id',
            filterField: 'table_id',
            filterValue: 40,
            labelField: 'description',
            orderBy: 'description',
            order: 'asc',
            includeDeleted: false,
          },
        },
        { field: 'created_at', header: 'Created At' },
        { field: 'created_by', header: 'Created By' },
        { field: 'deleted_at', header: 'Deleted At' },
        { field: 'description', header: 'Description' },
        { field: 'is_deleted', header: 'Is Deleted' },
        { field: 'transaction_date', header: 'Transaction Date' },
        { field: 'transaction_id', header: 'Transaction Id' },
        { field: 'updated_at', header: 'Updated At' },
        { field: 'updated_by', header: 'Updated By' },
        { field: 'wallet_id', header: 'Wallet Id' },
      ],
      rows: 10,
      rowsPerPageOptions: [5, 10, 20],
      actions: isAdmin ? ['update', 'delete'] : [],
      rowActions: [
        {
          icon: 'pi pi-eye',
          label: 'Detalle',
          severity: 'secondary',
          action: (row) => this.openDetail(row),
        },
      ],
    });

    this.transactionFields.set(
      formFields['transactionForm'].fields.map((field: any) => {
        if (field.key === 'transaction_id' || field.key === 'description') {
          return { ...field, readonly: true, state: { ...field.state, readonly: true } };
        }

        return field;
      }),
    );

    await this.loadTransactionTypes();
    await this.loadWalletSummary();
    await this.getData();
    this.isLoading.set(false);
  }

  protected applyPreset(days: number): void {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    this.filters.update((current) => ({
      ...current,
      fromDate,
      toDate,
    }));
    void this.refresh();
  }

  protected clearFilters(): void {
    this.filters.set({
      fromDate: null,
      toDate: null,
      catalogId: null,
      description: '',
    });
    void this.refresh();
  }

  protected async refresh(): Promise<void> {
    this.tableService.onPageChange({ first: 0, rows: this.tableService.getPageSize() });
    await this.getData();
  }

  protected openDetail(row: Record<string, any>): void {
    this.selectedTransaction.set(row);
    this.showDetailDialog.set(true);
  }

  protected closeDetail(): void {
    this.showDetailDialog.set(false);
    this.selectedTransaction.set(null);
  }

  protected async exportCsv(): Promise<void> {
    const rows = await this.fetchExportRows();
    if (!rows.length) {
      return;
    }

    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const csvLines = [headers.join(',')];

    for (const row of rows as Record<string, unknown>[]) {
      csvLines.push(headers.map((header) => JSON.stringify(row[header] ?? '')).join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  submitData = async ($event: string) => {
    const parsedData = JSON.parse($event);
    await this.setData(parsedData);
    this.id.set(null);
    await this.getData();
  };

  private id = signal<string | null>(null);
  private editData = signal<Record<string, any> | null>(null);
  private readonlyMode = signal(false);

  getData = async () => {
    const id = this._route.snapshot.paramMap.get('id');
    if (id) {
      this.id.set(id);
    }

    const url = this._route.snapshot.url.map((s) => s.path).join('/');
    const isDetail = url.endsWith('detail');
    const isEdit = url.endsWith('edit');

    let response;
    if (this.id()) {
      response = await this.dynamicService.fetchData({
        table: 'TRANSACTION',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: { field: 'transaction_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'TRANSACTION',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: this.buildFilters(),
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching transaction:', response);
    } else {
      this.tableService.setData(response);
      if ((isEdit || isDetail) && Array.isArray(response) && response.length > 0) {
        this.editData.set(response[0] as Record<string, any>);
      }
      if (isDetail) this.readonlyMode.set(true);
    }

    return response;
  };

  setData = async (data: any) => {
    if (this.id()) {
      await this.updateData(data);
    } else {
      await this.insertData(data);
    }
  };

  insertData = async (data: Partial<Database['public']['Tables']['TRANSACTION']['Insert']>) => {
    const response = await this.dynamicService.insertData('TRANSACTION', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['TRANSACTION']['Update']>) => {
    const response = await this.dynamicService.updateData('TRANSACTION', data, {
      field: 'transaction_id',
      value: this.id()!,
    });
    return response;
  };

  deleteData = async (rowId: string) => {
    const ref = this.dialogService.open(ConfirmDeleteModalComponent, {
      header: 'Confirmar eliminación',
      width: '420px',
      modal: true,
      breakpoints: { '640px': '90vw' },
      data: { label: `Registro ID: ${rowId}` },
    });

    const confirmed = await firstValueFrom(ref!.onClose);
    if (!confirmed) return;

    const response = await this.dynamicService.deleteData('TRANSACTION', {
      field: 'transaction_id',
      value: rowId,
    });

    if (!(response instanceof PostgrestError)) {
      await this.getData();
    }
  };

  onPageChange = async (event: { first: number; rows: number }) => {
    this.tableService.onPageChange(event);
    await this.getData();
  };

  protected onSearchChange(): void {
    void this.refresh();
  }

  protected onFromDateChange(value: Date | null): void {
    this.filters.update((c) => ({ ...c, fromDate: value }));
    void this.refresh();
  }

  protected onToDateChange(value: Date | null): void {
    this.filters.update((c) => ({ ...c, toDate: value }));
    void this.refresh();
  }

  protected onCatalogChange(value: number | null): void {
    this.filters.update((c) => ({ ...c, catalogId: value }));
    void this.refresh();
  }

  protected onDescriptionInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value ?? '';
    this.filters.update((c) => ({ ...c, description: val }));
  }

  protected getDisplayCatalogLabel(catalogId: number | null): string {
    if (catalogId === null) {
      return 'Todos';
    }

    return (
      this.transactionTypeOptions().find((option) => option.value === catalogId)?.label ?? 'Todos'
    );
  }

  private async loadTransactionTypes(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('CATALOG')
      .select('catalog_id, description')
      .eq('table_id', 40)
      .eq('is_deleted', false)
      .order('description');

    if (error) {
      console.error('Error loading transaction types:', error);
      return;
    }

    const options: TransactionTypeOption[] = [
      { label: 'Todos', value: null },
      ...((data ?? []) as { catalog_id: number; description: string }[]).map((item) => ({
        label: item.description,
        value: item.catalog_id,
      })),
    ];

    this.transactionTypeOptions.set(options);
  }

  private async loadWalletSummary(): Promise<void> {
    try {
      const userId = Number(this.auth.getInternalUserId());
      if (!userId) {
        return;
      }

      const { data: wallet } = await this.walletService.getWallet(userId);
      if (wallet) {
        this.wallet.set({ wallet_id: wallet.wallet_id, balance: wallet.balance });
      }
    } catch (err) {
      console.error('Error loading wallet for transactions view', err);
    }
  }

  private buildFilters(): DynamicQueryFilter[] {
    const filters: DynamicQueryFilter[] = [];
    const isAdmin = (this.auth.role() ?? '').toLowerCase() === 'admin';
    const walletId = this.wallet()?.wallet_id;
    const { fromDate, toDate, catalogId, description } = this.filters();

    if (!isAdmin) {
      if (!walletId) {
        // Wallet not loaded yet or user has no wallet — return impossible filter to show zero rows
        filters.push({ field: 'wallet_id', value: '-1', operator: 'eq' });
      } else {
        filters.push({ field: 'wallet_id', value: String(walletId), operator: 'eq' });
      }
    }

    if (fromDate) {
      const isoFrom = fromDate.toISOString().slice(0, 10);
      filters.push({ field: 'transaction_date', value: isoFrom, operator: 'gte' });
    }

    if (toDate) {
      const isoTo = new Date(toDate);
      isoTo.setHours(23, 59, 59, 999);
      filters.push({
        field: 'transaction_date',
        value: isoTo.toISOString().slice(0, 10),
        operator: 'lte',
      });
    }

    if (catalogId) {
      filters.push({ field: 'catalog_id', value: String(catalogId), operator: 'eq' });
    }

    if (description.trim()) {
      filters.push({ field: 'description', value: `%${description.trim()}%`, operator: 'ilike' });
    }

    return filters;
  }

  private async fetchExportRows(): Promise<Record<string, unknown>[]> {
    const isAdmin = (this.auth.role() ?? '').toLowerCase() === 'admin';
    const walletId = this.wallet()?.wallet_id;
    const { fromDate, toDate, catalogId, description } = this.filters();

    const query = this.supabase.client.from('TRANSACTION').select('*').order('created_at', {
      ascending: false,
    });

    let filtered = query;
    if (!isAdmin) {
      // If wallet is unknown, export nothing rather than leaking all transactions
      filtered = filtered.eq('wallet_id', walletId ?? -1);
    }
    if (fromDate) {
      filtered = filtered.gte('transaction_date', fromDate.toISOString().slice(0, 10));
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.lte('transaction_date', endDate.toISOString().slice(0, 10));
    }
    if (catalogId) {
      filtered = filtered.eq('catalog_id', catalogId);
    }
    if (description.trim()) {
      filtered = filtered.ilike('description', `%${description.trim()}%`);
    }

    const { data, error } = await filtered;
    if (error) {
      console.error('Error exporting transactions:', error);
      return [];
    }

    return (data ?? []) as Record<string, unknown>[];
  }
}
