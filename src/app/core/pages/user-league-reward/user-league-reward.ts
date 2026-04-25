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
  selector: 'app-user-league-reward',
  imports: COMPONENTS,
  templateUrl: './user-league-reward.html',
  styleUrl: './user-league-reward.css',
})
export class UserLeagueRewardPage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['USER_LEAGUE_REWARD'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'User League Reward',
    columns: [
      { field: 'amount', header: 'Amount' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'league_user_reward_id', header: 'League User Reward Id' },
      { field: 'payment_date', header: 'Payment Date' },
      { field: 'status', header: 'Status' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_league_id', header: 'User League Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['userLeagueRewardForm'].fields;
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
        table: 'USER_LEAGUE_REWARD',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: 'user_league_reward_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'USER_LEAGUE_REWARD',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching user_league_reward:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['USER_LEAGUE_REWARD']['Insert']>) => {
    const response = await this.dynamicService.insertData('USER_LEAGUE_REWARD', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['USER_LEAGUE_REWARD']['Update']>) => {
    const response = await this.dynamicService.updateData('USER_LEAGUE_REWARD', data, { field: 'user_league_reward_id', value: this.id()! });
    return response;
  };
}
