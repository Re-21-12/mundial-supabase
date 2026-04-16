import { Database } from './../../../types/database.types';
import { Component, inject, model, signal, WritableSignal } from '@angular/core';
import { DynamicService } from '../../services/dynamic-service';
import { TableTemplateModel } from '../../../shared/features/dynamic-table/interfaces/table-interface';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';
const COMPONENTS = [DynamicForm];
@Component({
  selector: 'app-teams',
  imports: [COMPONENTS, Overlay],
  templateUrl: './teams.html',
  styleUrl: './teams.css',
})
export class Teams {
  visible = model(false);

  items: Database['public']['Tables']['TEAM'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Teams',
    columns: [
      { field: 'team_id', header: 'ID' },
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
  fields = formFields['teamForm'].fields;
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
      table: 'TEAM',
      order: 'asc',
      limit: 10,
      page: 0,
    });
    if (response instanceof PostgrestError) {
      console.error('Error fetching teams:', response);
    } else {
      console.log('Fetched teams:', response);
      this.tableProps.update((props) => ({ ...props, data: response }));
    }
    return response;
  };
}
