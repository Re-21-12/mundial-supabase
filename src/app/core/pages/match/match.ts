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
  selector: 'app-match',
  imports: COMPONENTS,
  templateUrl: './match.html',
  styleUrl: './match.css',
})
export class MatchPage implements OnInit {
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
        table: 'MATCH',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: 'match_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'MATCH',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching match:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['MATCH']['Insert']>) => {
    const response = await this.dynamicService.insertData('MATCH', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['MATCH']['Update']>) => {
    const response = await this.dynamicService.updateData('MATCH', data, { field: 'match_id', value: this.id()! });
    return response;
  };
}
