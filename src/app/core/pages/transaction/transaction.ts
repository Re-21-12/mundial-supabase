import { Database } from './../../../types/database.types';
import { Component, inject, model, signal, WritableSignal } from '@angular/core';
import { DynamicService } from '../../services/dynamic-service';
import { TableTemplateModel } from '../../../shared/features/dynamic-table/interfaces/table-interface';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';

const COMPONENTS = [DynamicForm, Overlay];

@Component({
  selector: 'app-transaction',
  imports: COMPONENTS,
  templateUrl: './transaction.html',
  styleUrl: './transaction.css',
})
export class TransactionPage {
  visible = model(false);

  items: Database['public']['Tables']['TRANSACTION'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Transaction',
    columns: [
      { field: 'amount', header: 'Amount' },
      { field: 'catalog_id', header: 'Catalog Id' },
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
    data: [],
  });

  fields = formFields['transactionForm'].fields;
  readonly dynamicService = inject(DynamicService);

  ngOnInit() {
    this.getData();
  }

  submitData = ($event: string) => {
    const parsedData = JSON.parse($event);
    this.insertData(parsedData);
  };

  getData = async () => {
    const response = await this.dynamicService.fetchData({
      table: 'TRANSACTION',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching transaction:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['TRANSACTION']['Insert']>) => {
    const response = await this.dynamicService.insertData('TRANSACTION', data);
    return response;
  };
}
