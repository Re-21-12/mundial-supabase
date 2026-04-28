import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DynamicService } from '../../services/dynamic-service';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';
import { DynamicQueryFilter } from '../../interfaces/dynamic-query-interface';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmDeleteModalComponent } from '../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { firstValueFrom } from 'rxjs';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';

@Component({
  selector: 'app-stadium',
  imports: [DynamicForm, Overlay],
  templateUrl: './stadium.html',
  styleUrl: './stadium.css',
  providers: [DialogService, DynamicTableService],
})
export class Stadium implements OnInit {
  visible = model(false);
  id = signal<string | null>(null);
  items: Database['public']['Tables']['STADIUM'][] = [];

  fields = formFields['stadiumForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  private readonly dialogService = inject(DialogService);

  ngOnInit() {
    this.tableService.initTable({
      header: 'Stadiums',
      columns: [
        { field: 'stadium_id', header: 'ID' },
        { field: 'name', header: 'Name' },
        { field: 'catalog_id', header: 'Country' },
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

    const page = this.tableService.getCurrentPage();
    const pageSize = this.tableService.getPageSize();

    let response;
    if (this.id()) {
      response = await this.dynamicService.fetchData({
        table: 'STADIUM',
        order: 'asc',
        limit: pageSize,
        page: page,
        columns: '*',
        filters: { field: 'stadium_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'STADIUM',
        order: 'asc',
        limit: pageSize,
        page: page,
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching stadium:', response);
    } else {
      console.log('User role data:', response);
      this.tableService.setData(response);
      if ((isEdit || isDetail) && Array.isArray(response) && response.length > 0) {
        this.editData.set(response[0] as Record<string, any>);
      }
      if (isDetail) this.readonlyMode.set(true);
    }

    return response;
  };

  onPageChange = async (event: { first: number; rows: number }) => {
    this.tableService.onPageChange(event);
    await this.getData();
  };

  setData = async (data: any) => {
    if (this.id()) {
      console.log('Editing stadium:', this.id());
      await this.updateData(data);
    } else {
      console.log('Inserting stadium');
      await this.insertData(data);
    }
  };
  insertData = async (data: Partial<Database['public']['Tables']['STADIUM']['Insert']>) => {
    const response = await this.dynamicService.insertData('STADIUM', data);
    return response;
  };
  updateData = async (data: Partial<Database['public']['Tables']['STADIUM']['Update']>) => {
    const response = await this.dynamicService.updateData('STADIUM', data, {
      field: 'stadium_id',
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
      data: { label: `Estadio ID: ${rowId}` },
    });

    const confirmed = await firstValueFrom(ref!.onClose);
    if (!confirmed) return;

    const response = await this.dynamicService.deleteData('STADIUM', {
      field: 'stadium_id',
      value: rowId,
    });
    if (!(response instanceof PostgrestError)) {
      await this.getData();
    }
  };
}
