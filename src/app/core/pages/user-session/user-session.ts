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
  selector: 'app-user-session',
  imports: COMPONENTS,
  templateUrl: './user-session.html',
  styleUrl: './user-session.css',
})
export class UserSessionPage {
  visible = model(false);

  items: Database['public']['Tables']['USER_SESSION'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'User Session',
    columns: [
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'ip_address', header: 'Ip Address' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'login', header: 'Login' },
      { field: 'session_id', header: 'Session Id' },
      { field: 'sign_in', header: 'Sign In' },
      { field: 'sign_out', header: 'Sign Out' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_agent', header: 'User Agent' },
      { field: 'user_id', header: 'User Id' },
      { field: 'user_session_id', header: 'User Session Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['userSessionForm'].fields;
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
      table: 'USER_SESSION',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching user_session:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['USER_SESSION']['Insert']>) => {
    const response = await this.dynamicService.insertData('USER_SESSION', data);
    return response;
  };
}
