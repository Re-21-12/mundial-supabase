import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DynamicQueryFilter } from '../../interfaces/dynamic-query-interface';
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
export class PredictionPage implements OnInit {
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
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);

  ngOnInit() {
    this.getData();
  }

  submitData = async ($event: string) => {
    const parsedData = JSON.parse($event);
    await this.setData(parsedData);
    this.id.set(null);
    await this.getData();
  };

  getData = async () => {
    const id = this._route.snapshot.paramMap.get('id');
    if (id) { this.id.set(id); }
    const url = this._route.snapshot.url.map(s => s.path).join('/');
    const isDetail = url.endsWith('detail');
    const isEdit = url.endsWith('edit');

    let response;
    if (this.id()) {
      response = await this.dynamicService.fetchData({
        table: 'PREDICTION',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: 'prediction_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'PREDICTION',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching prediction:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
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

  insertData = async (data: Partial<Database['public']['Tables']['PREDICTION']['Insert']>) => {
    const response = await this.dynamicService.insertData('PREDICTION', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['PREDICTION']['Update']>) => {
    const response = await this.dynamicService.updateData('PREDICTION', data, { field: 'prediction_id', value: this.id()! });
    return response;
  };
}
