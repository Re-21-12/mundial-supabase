import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { PostgrestError } from '@supabase/supabase-js';

import { AuthFacade } from '../../../../shared/features/auth/auth.facade';
import { DynamicForm } from '../../../../shared/features/dynamic-form/dynamic-form';
import { FieldBase } from '../../../../shared/features/dynamic-form/interfaces/field-props';
import { ConfirmDeleteModalComponent } from '../../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { Database } from '../../../../types/database.types';
import { DynamicQueryFilter } from '../../../interfaces/dynamic-query-interface';
import { DynamicService } from '../../../services/dynamic-service';
import { SupabaseService } from '../../../services/supabase-service';
import { WalletService } from '../wallet/wallet.service';
import { DynamicTableService } from '../../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DynamicTable } from '../../../../shared/features/dynamic-table/dynamic-table';
import { Overlay } from '../../../../shared/layouts/overlay/overlay';
import { formFields } from '../../../../shared/features/dynamic-form/utils/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { NotificationService } from '../../../../shared/services/notification-service';

@Component({
  selector: 'app-league-reward',
  imports: [DynamicForm, Overlay],
  templateUrl: './league-reward.html',
  styleUrl: './league-reward.css',
  providers: [DialogService, DynamicTableService],
})
export class LeagueRewardPage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['LEAGUE_REWARD'][] = [];

  fields = formFields['leagueRewardForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  private readonly dialogService = inject(DialogService);

  ngOnInit() {
    this.tableService.initTable({
      header: 'League Reward',
      columns: [
        { field: 'created_at', header: 'Created At' },
        { field: 'created_by', header: 'Created By' },
        { field: 'deleted_at', header: 'Deleted At' },
        { field: 'global_prize_1pct', header: 'Global Prize 1pct' },
        { field: 'is_deleted', header: 'Is Deleted' },
        {
          field: 'league_id',
          header: 'League',
          optionsSource: {
            table: 'LEAGUE',
            valueField: 'league_id',
            filterField: 'league_id',
            labelField: 'name',
            orderBy: 'name',
            order: 'asc',
            includeDeleted: false,
          },
        },
        { field: 'league_reward_id', header: 'League Reward Id' },
        { field: 'mundial_id', header: 'Mundial Id' },
        { field: 'platform_fee_5pct', header: 'Platform Fee 5pct' },
        { field: 'total_collected_amount', header: 'Total Collected Amount' },
        { field: 'updated_at', header: 'Updated At' },
        { field: 'updated_by', header: 'Updated By' },
      ],
      rows: 10,
      rowsPerPageOptions: [5, 10, 20],
    });
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
    if (id) {
      this.id.set(id);
    }
    const url = this._route.snapshot.url.map((s) => s.path).join('/');
    const isDetail = url.endsWith('detail');
    const isEdit = url.endsWith('edit');

    let response;
    if (this.id()) {
      response = await this.dynamicService.fetchData({
        table: 'LEAGUE_REWARD',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: { field: 'league_reward_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'LEAGUE_REWARD',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching league_reward:', response);
    } else {
      this.tableService.setData(response);
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

  insertData = async (data: Partial<Database['public']['Tables']['LEAGUE_REWARD']['Insert']>) => {
    const response = await this.dynamicService.insertData('LEAGUE_REWARD', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['LEAGUE_REWARD']['Update']>) => {
    const response = await this.dynamicService.updateData('LEAGUE_REWARD', data, {
      field: 'league_reward_id',
      value: this.id()!,
    });
    return response;
  };
  deleteData = async (rowId: string) => {
    const ref = this.dialogService.open(ConfirmDeleteModalComponent, {
      header: 'Confirmar eliminación',
      width: '420px',
      modal: true,
      breakpoints: { '640px': '90vw' },
      data: { label: `Registro ID: ${rowId}` },
    });

    const confirmed = await firstValueFrom(ref!.onClose);
    if (!confirmed) return;

    const response = await this.dynamicService.deleteData('LEAGUE_REWARD', {
      field: 'league_reward_id',
      value: rowId,
    });

    if (!(response instanceof PostgrestError)) {
      await this.getData();
    }
  };
  onPageChange = async (event: { first: number; rows: number }) => {
    this.tableService.onPageChange(event);
    await this.getData();
  };
}
