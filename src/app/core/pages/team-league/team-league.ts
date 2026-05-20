import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DynamicService } from '../../services/dynamic-service';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmDeleteModalComponent } from '../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { firstValueFrom } from 'rxjs';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from './team-league-form';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';

@Component({
  selector: 'app-team-league',
  imports: [DynamicForm, Overlay],
  templateUrl: './team-league.html',
  styleUrl: './team-league.css',
  providers: [DialogService, DynamicTableService],
})
export class TeamLeaguePage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['TEAM_LEAGUE'][] = [];

  fields = formFields['teamLeagueForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  private readonly dialogService = inject(DialogService);

  ngOnInit() {
    this.tableService.initTable({
      header: 'Team League',
      columns: [
        { field: 'team_league_id', header: 'ID' },
        { field: 'league_id', header: 'Liga' },
        { field: 'team_id', header: 'Equipo' },
        { field: 'points', header: 'Puntos' },
        { field: 'games_played', header: 'PJ' },
        { field: 'wins', header: 'Ganados' },
        { field: 'draws', header: 'Empatados' },
        { field: 'losses', header: 'Perdidos' },
        { field: 'goals_for', header: 'GF' },
        { field: 'goals_against', header: 'GC' },
        { field: 'is_deleted', header: 'Eliminado' },
        { field: 'created_at', header: 'Creado' },
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
        table: 'TEAM_LEAGUE',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: { field: 'team_league_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'TEAM_LEAGUE',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching team league:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['TEAM_LEAGUE']['Insert']>) => {
    const response = await this.dynamicService.insertData('TEAM_LEAGUE', data);
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['TEAM_LEAGUE']['Update']>) => {
    const response = await this.dynamicService.updateData('TEAM_LEAGUE', data, {
      field: 'team_league_id',
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

    const response = await this.dynamicService.deleteData('TEAM_LEAGUE', {
      field: 'team_league_id',
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
