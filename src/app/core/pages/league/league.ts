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
  selector: 'app-league',
  imports: COMPONENTS,
  templateUrl: './league.html',
  styleUrl: './league.css',
})
export class LeaguePage {
  visible = model(false);

  items: Database['public']['Tables']['LEAGUE'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'League',
    columns: [
      { field: 'catalog_id', header: 'Catalog Id' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'invitation_code', header: 'Invitation Code' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'league_id', header: 'League Id' },
      { field: 'name', header: 'Name' },
      { field: 'status', header: 'Status' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_id', header: 'User Id' },
      { field: 'world_league_id', header: 'World League Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['leagueForm'].fields;
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
      table: 'LEAGUE',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching league:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['LEAGUE']['Insert']>) => {
    const response = await this.dynamicService.insertData('LEAGUE', data);
    return response;
  };
}
