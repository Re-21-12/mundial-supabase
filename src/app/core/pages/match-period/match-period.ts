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
  selector: 'app-match-period',
  imports: COMPONENTS,
  templateUrl: './match-period.html',
  styleUrl: './match-period.css',
})
export class MatchPeriodPage {
  visible = model(false);

  items: Database['public']['Tables']['MATCH_PERIOD'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Match Period',
    columns: [
      { field: 'catalog_id', header: 'Catalog Id' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'first_team_score', header: 'First Team Score' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'match_id', header: 'Match Id' },
      { field: 'period_id', header: 'Period Id' },
      { field: 'second_team_score', header: 'Second Team Score' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['matchPeriodForm'].fields;
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
      table: 'MATCH_PERIOD',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching match_period:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['MATCH_PERIOD']['Insert']>) => {
    const response = await this.dynamicService.insertData('MATCH_PERIOD', data);
    return response;
  };
}
