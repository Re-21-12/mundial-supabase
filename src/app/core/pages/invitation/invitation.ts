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
  selector: 'app-invitation',
  imports: COMPONENTS,
  templateUrl: './invitation.html',
  styleUrl: './invitation.css',
})
export class InvitationPage {
  visible = model(false);

  items: Database['public']['Tables']['INVITATION'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Invitation',
    columns: [
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'expiration_date', header: 'Expiration Date' },
      { field: 'invitation_id', header: 'Invitation Id' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'send_date', header: 'Send Date' },
      { field: 'status', header: 'Status' },
      { field: 'token', header: 'Token' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_league_id', header: 'User League Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['invitationForm'].fields;
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
      table: 'INVITATION',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching invitation:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['INVITATION']['Insert']>) => {
    const response = await this.dynamicService.insertData('INVITATION', data);
    return response;
  };
}
