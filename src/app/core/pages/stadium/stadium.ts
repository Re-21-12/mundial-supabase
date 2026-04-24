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
  selector: 'app-stadium',
  imports: COMPONENTS,
  templateUrl: './stadium.html',
  styleUrl: './stadium.css',
})
export class Stadium {
  visible = model(false);

  items: Database['public']['Tables']['STADIUM'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Stadiums',
    columns: [
      { field: 'stadium_id', header: 'ID' },
      { field: 'name', header: 'Name' },
      { field: 'catalog_id', header: 'Country' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'deleted_at', header: 'Delete At' },
      { field: 'deleted_by', header: 'Delete By' },
      { field: 'is_deleted', header: 'Is Deleted' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });
  fields = formFields['stadiumForm'].fields;
  readonly dynamicService = inject(DynamicService);

  ngOnInit() {
    this.getData();
  }
  submitData = ($event: string) => {
    const parsedData = JSON.parse($event);
    console.log('Data to submit:', $event);
    console.log('Data to submit:', parsedData);
  };
  getData = async () => {
    const response = await this.dynamicService.fetchData({
      table: 'STADIUM',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });
    if (response instanceof PostgrestError) {
      console.error('Error fetching stadiums:', response);
    } else {
      console.log('Fetched stadiums:', response);
      this.tableProps.update((props) => ({ ...props, data: response }));
    }
    return response;
  };
  insertData = async (data: Partial<Database['public']['Tables']['STADIUM']['Insert']>) => {
    const response = await this.dynamicService.insertData('STADIUM', data);
    return response;
  };
}
