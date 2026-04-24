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
  selector: 'app-prediction',
  imports: COMPONENTS,
  templateUrl: './prediction.html',
  styleUrl: './prediction.css',
})
export class PredictionPage {
  visible = model(false);

  items: Database['public']['Tables']['PREDICTION'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Prediction',
    columns: [
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'first_team_score', header: 'First Team Score' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'match_id', header: 'Match Id' },
      { field: 'prediction_id', header: 'Prediction Id' },
      { field: 'second_team_score', header: 'Second Team Score' },
      { field: 'turn', header: 'Turn' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_league_id', header: 'User League Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['predictionForm'].fields;
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
      table: 'PREDICTION',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching prediction:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['PREDICTION']['Insert']>) => {
    const response = await this.dynamicService.insertData('PREDICTION', data);
    return response;
  };
}
