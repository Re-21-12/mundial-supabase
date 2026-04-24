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
  selector: 'app-wallet',
  imports: COMPONENTS,
  templateUrl: './wallet.html',
  styleUrl: './wallet.css',
})
export class WalletPage {
  visible = model(false);

  items: Database['public']['Tables']['WALLET'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Wallet',
    columns: [
      { field: 'balance', header: 'Balance' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'status', header: 'Status' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_id', header: 'User Id' },
      { field: 'wallet_id', header: 'Wallet Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['walletForm'].fields;
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
      table: 'WALLET',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching wallet:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['WALLET']['Insert']>) => {
    const response = await this.dynamicService.insertData('WALLET', data);
    return response;
  };
}
