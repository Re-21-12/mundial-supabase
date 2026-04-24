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
  selector: 'app-user',
  imports: COMPONENTS,
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class UserPage {
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
      table: 'USER',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching user:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['USER']['Insert']>) => {
    const response = await this.dynamicService.insertData('USER', data);
    return response;
  };
}
