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
const COMPONENTS = [DynamicForm];
@Component({
  selector: 'app-catalog',
  imports: [COMPONENTS, Overlay],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['CATALOG'][] = [];

  tableProps: WritableSignal<TableTemplateModel> = signal({
    header: 'Catalogs',
    columns: [
      { field: 'catalog_id', header: 'ID' },
      { field: 'table_name', header: 'Table Name' },
      { field: 'description', header: 'Description' },
      { field: 'value', header: 'Value' },
      { field: 'created_at', header: 'Created At' },
      { field: 'created_by', header: 'Created By' },
      { field: 'updated_at', header: 'Updated At' },
      { field: 'updated_by', header: 'Updated By' },
      { field: 'deleted_at', header: 'Delete At' },
      { field: 'deleted_by', header: 'Delete By' },
      { field: 'is_deleted', header: 'Is Deleted' },
    ],
    rows: 10,
    rowsPerPageOptions: [5, 10, 20],
    data: [],
  });
  fields = formFields['catalogForm'].fields;
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
        table: 'CATALOG',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
        filters: { field: 'catalog_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'CATALOG',
        order: 'asc',
        limit: 10,
        page: 0,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching catalog:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['CATALOG']['Insert']>) => {
    const response = await this.dynamicService.insertData('CATALOG', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['CATALOG']['Update']>) => {
    const response = await this.dynamicService.updateData('CATALOG', data, { field: 'catalog_id', value: this.id()! });
    return response;
  };
}
