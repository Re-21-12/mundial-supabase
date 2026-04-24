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
  selector: 'app-audit-log',
  imports: COMPONENTS,
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.css',
})
export class AuditLogPage {
  visible = model(false);

  items: Database['public']['Tables']['AUDIT_LOG'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Audit Log',
    columns: [
      { field: 'audit_log_id', header: 'Audit Log Id' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'deleted_at', header: 'Deleted At' },
      { field: 'is_deleted', header: 'Is Deleted' },
      { field: 'new_values', header: 'New Values' },
      { field: 'old_values', header: 'Old Values' },
      { field: 'operation_type', header: 'Operation Type' },
      { field: 'table_name', header: 'Table Name' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'user_session_id', header: 'User Session Id' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });

  fields = formFields['auditLogForm'].fields;
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
      table: 'AUDIT_LOG',
      order: 'asc',
      limit: 10,
      page: 0,
      columns: '*',
    });

    if (response instanceof PostgrestError) {
      console.error('Error fetching audit_log:', response);
    } else {
      this.tableProps.update((props) => ({ ...props, data: response }));
    }

    return response;
  };

  insertData = async (data: Partial<Database['public']['Tables']['AUDIT_LOG']['Insert']>) => {
    const response = await this.dynamicService.insertData('AUDIT_LOG', data);
    return response;
  };
}
