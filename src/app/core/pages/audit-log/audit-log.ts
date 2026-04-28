import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DynamicQueryFilter } from '../../interfaces/dynamic-query-interface';
import { DynamicService } from '../../services/dynamic-service';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';

@Component({
  selector: 'app-audit-log',
  imports: [DynamicForm, Overlay],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.css',
  providers: [DynamicTableService],
})
export class AuditLogPage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['AUDIT_LOG'][] = [];

  fields = formFields['auditLogForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);

  ngOnInit() {
    this.tableService.initTable({
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
        table: 'AUDIT_LOG',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: { field: 'audit_log_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'AUDIT_LOG',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching audit_log:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['AUDIT_LOG']['Insert']>) => {
    const response = await this.dynamicService.insertData('AUDIT_LOG', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['AUDIT_LOG']['Update']>) => {
    const response = await this.dynamicService.updateData('AUDIT_LOG', data, {
      field: 'audit_log_id',
      value: this.id()!,
    });
    return response;
  };

  onPageChange = async (event: { first: number; rows: number }) => {
    this.tableService.onPageChange(event);
    await this.getData();
  };
}
