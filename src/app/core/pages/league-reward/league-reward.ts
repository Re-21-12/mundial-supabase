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
  selector: 'app-league-reward',
  imports: COMPONENTS,
  templateUrl: './league-reward.html',
  styleUrl: './league-reward.css',
})
export class LeagueRewardPage {
  visible = model(false);

  items: Database['public']['Tables']['LEAGUE_REWARD'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'League Reward',
    columns: [
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'global_prize_1pct', header: 'Global Prize 1pct' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'league_id', header: 'League Id' },
      { field: 'league_reward_id', header: 'League Reward Id' },
      { field: 'mundial_id', header: 'Mundial Id' },
      { field: 'platform_fee_5pct', header: 'Platform Fee 5pct' },
      { field: 'total_collected_amount', header: 'Total Collected Amount' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['leagueRewardForm'].fields;
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
      table: 'LEAGUE_REWARD',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching league_reward:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['LEAGUE_REWARD']['Insert']>) => {
    const response = await this.dynamicService.insertData('LEAGUE_REWARD', data);
    return response;
  };
}
