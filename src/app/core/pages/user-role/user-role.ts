import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal, WritableSignal } from '@angular/core';
import { DynamicService } from '../../services/dynamic-service';
import { TableTemplateModel } from '../../../shared/features/dynamic-table/interfaces/table-interface';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';
import { ActivatedRoute } from '@angular/router';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';

@Component({
  selector: 'app-user-role',
  imports: [DynamicForm, Overlay],
  templateUrl: './user-role.html',
  styleUrl: './user-role.css',
  providers: [DynamicTableService],
})
export class UserRolePage implements OnInit {
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  visible = model(false);

  items: Database['public']['Tables']['USER_ROLE'][] = [];

  fields = formFields['userRoleForm'].fields;
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  ngOnInit() {
    this.tableService.initTable({
      header: 'User Role',
      columns: [
        { field: 'created_at', header: 'Created At' },
        { field: 'created_by', header: 'Created By' },
        { field: 'deleted_at', header: 'Deleted At' },
        { field: 'is_deleted', header: 'Is Deleted' },
        { field: 'role_id', header: 'Role Id' },
        { field: 'updated_at', header: 'Updated At' },
        { field: 'updated_by', header: 'Updated By' },
        { field: 'user_id', header: 'User Id' },
        { field: 'user_role_id', header: 'User Role Id' },
      ],
      rows: 10,
      rowsPerPageOptions: [5, 10, 20],
    });
    this.getData();
  }

  submitData = async ($event: string) => {
    const parsedData = JSON.parse($event);
    await this.setData(parsedData);
    // Resetear el id para que getData recargue la lista completa
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
        table: 'USER_ROLE',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: 'user_role_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'USER_ROLE',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching user_role:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['USER_ROLE']['Insert']>) => {
    const response = await this.dynamicService.insertData('USER_ROLE', data);
    return response;
  };
  updateData = async (data: Partial<Database['public']['Tables']['USER_ROLE']['Update']>) => {
    const response = await this.dynamicService.updateData('USER_ROLE', data, {
      field: 'user_role_id',
      value: this.id()!,
    });
  };

  onPageChange = async (event: { first: number; rows: number }) => {
    this.tableService.onPageChange(event);
    await this.getData();
  };
}
