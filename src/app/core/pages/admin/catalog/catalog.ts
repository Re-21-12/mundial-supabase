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
  selector: 'app-catalog',
  imports: [DynamicForm, Overlay],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  providers: [DialogService, DynamicTableService],
})
export class Catalog implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['CATALOG'][] = [];
  fields = formFields['catalogForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  private readonly dialogService = inject(DialogService);

  ngOnInit() {
    this.tableService.initTable({
      header: 'Catalogs',
      columns: [
        { field: 'catalog_id', header: 'ID' },
        { field: 'table_id', header: 'Table ID' },
        { field: 'table_name', header: 'Table Name' },
        { field: 'description', header: 'Description' },
        { field: 'value', header: 'Value' },
        { field: 'created_at', header: 'Created At' },
        {
          field: 'created_by',
          header: 'Created By',
          optionsSource: {
            table: 'USER',
            valueField: 'user_id',
            filterField: 'user_id',
            labelField: 'name',
            orderBy: 'name',
            order: 'asc',
            includeDeleted: false,
          },
        },
        { field: 'updated_at', header: 'Updated At' },
        {
          field: 'updated_by',
          header: 'Updated By',
          optionsSource: {
            table: 'USER',
            valueField: 'user_id',
            filterField: 'user_id',
            labelField: 'name',
            orderBy: 'name',
            order: 'asc',
            includeDeleted: false,
          },
        },
        { field: 'deleted_at', header: 'Delete At' },
        {
          field: 'deleted_by',
          header: 'Delete By',
          optionsSource: {
            table: 'USER',
            valueField: 'user_id',
            filterField: 'user_id',
            labelField: 'name',
            orderBy: 'name',
            order: 'asc',
            includeDeleted: false,
          },
        },
        { field: 'is_deleted', header: 'Is Deleted' },
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
        table: 'CATALOG',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: { field: 'catalog_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'CATALOG',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching catalog:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['CATALOG']['Insert']>) => {
    const response = await this.dynamicService.insertData('CATALOG', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['CATALOG']['Update']>) => {
    const response = await this.dynamicService.updateData('CATALOG', data, {
      field: 'catalog_id',
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

    const response = await this.dynamicService.deleteData('CATALOG', {
      field: 'catalog_id',
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
