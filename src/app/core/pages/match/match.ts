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
  selector: 'app-match',
  imports: COMPONENTS,
  templateUrl: './match.html',
  styleUrl: './match.css',
})
export class MatchPage {
  visible = model(false);

  items: Database['public']['Tables']['MATCH'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Match',
    columns: [
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'first_team_id', header: 'First Team Id' },
      { field: 'first_team_total', header: 'First Team Total' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'league_id', header: 'League Id' },
      { field: 'match_id', header: 'Match Id' },
      { field: 'second_team_id', header: 'Second Team Id' },
      { field: 'second_team_total', header: 'Second Team Total' },
      { field: 'stadium_id', header: 'Stadium Id' },
      { field: 'start_time', header: 'Start Time' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['matchForm'].fields;
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
      table: 'MATCH',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching match:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['MATCH']['Insert']>) => {
    const response = await this.dynamicService.insertData('MATCH', data);
    return response;
  };
}
