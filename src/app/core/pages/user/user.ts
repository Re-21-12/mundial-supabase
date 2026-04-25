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
  selector: 'app-user',
  imports: COMPONENTS,
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class UserPage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['USER'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'User',
    columns: [
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'email', header: 'Email' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'login', header: 'Login' },
      { field: 'name', header: 'Name' },
      { field: 'password_hash', header: 'Password Hash' },
      { field: 'registration_date', header: 'Registration Date' },
      { field: 'status', header: 'Status' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_id', header: 'User Id' },
      { field: 'uuid', header: 'Uuid' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['userForm'].fields;
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
        table: 'USER',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: 'user_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'USER',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching user:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['USER']['Insert']>) => {
    const response = await this.dynamicService.insertData('USER', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['USER']['Update']>) => {
    const response = await this.dynamicService.updateData('USER', data, { field: 'user_id', value: this.id()! });
    return response;
  };
}
