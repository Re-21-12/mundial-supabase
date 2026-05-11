import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DynamicQueryFilter } from '../../interfaces/dynamic-query-interface';
import { DynamicService } from '../../services/dynamic-service';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmDeleteModalComponent } from '../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { firstValueFrom } from 'rxjs';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from './catalog-form';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';
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



