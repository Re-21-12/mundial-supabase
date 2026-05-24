import { Database } from './../../../types/database.types';
import { Component, inject, model, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DynamicService } from '../../services/dynamic-service';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmDeleteModalComponent } from '../../../shared/features/dynamic-modal/confirm-delete-modal.component';
import { firstValueFrom } from 'rxjs';
import { PostgrestError } from '@supabase/supabase-js';
import { formFields } from './match-form';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { Overlay } from '../../../shared/layouts/overlay/overlay';
import { LeagueScoringService } from '../league/league-scoring.service';

const MATCH_DURATION_MINUTES = 120;

@Component({
  selector: 'app-match',
  imports: [DynamicForm, Overlay],
  templateUrl: './match.html',
  styleUrl: './match.css',
  providers: [DialogService, DynamicTableService],
})
export class MatchPage implements OnInit {
  visible = model(false);

  items: Database['public']['Tables']['MATCH'][] = [];

  fields = formFields['matchForm'].fields;
  private readonly _route = inject(ActivatedRoute);
  id = signal<string | null>(null);
  editData = signal<Record<string, any> | null>(null);
  readonlyMode = signal<boolean>(false);
  readonly dynamicService = inject(DynamicService);
  readonly tableService = inject(DynamicTableService);
  private readonly dialogService = inject(DialogService);
  private readonly scoringService = inject(LeagueScoringService);

  ngOnInit() {
    this.tableService.initTable({
      header: 'Match',
      columns: [
        { field: 'created_at', header: 'Created At' },
        { field: 'created_by', header: 'Created By' },
        { field: 'deleted_at', header: 'Deleted At' },
        { field: 'first_team_id', header: 'First Team Id' },
        { field: 'first_team_total', header: 'First Team Total' },
        { field: 'is_deleted', header: 'Is Deleted' },
        { field: 'league_id', header: 'League Id' },
        { field: 'match_id', header: 'Match Id' },
        { field: 'second_team_id', header: 'Second Team Id' },
        { field: 'second_team_total', header: 'Second Team Total' },
        { field: 'stadium_id', header: 'Stadium Id' },
        { field: 'start_time', header: 'Inicio' },
        { field: 'end_time', header: 'Fin' },
        { field: 'updated_at', header: 'Updated At' },
        { field: 'updated_by', header: 'Updated By' },
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
        table: 'MATCH',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
        filters: { field: 'match_id', value: this.id()! },
      });
    } else {
      response = await this.dynamicService.fetchData({
        table: 'MATCH',
        order: 'asc',
        limit: this.tableService.getPageSize(),
        page: this.tableService.getCurrentPage(),
        columns: '*',
      });
    }

    if (response instanceof PostgrestError) {
      console.error('Error fetching match:', response);
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

  insertData = async (data: Partial<Database['public']['Tables']['MATCH']['Insert']>) => {
    const response = await this.dynamicService.insertData(
      'MATCH',
      this.normalizeMatchDuration(data),
    );
    return response;
  };

  updateData = async (data: Partial<Database['public']['Tables']['MATCH']['Update']>) => {
    const normalized = this.normalizeMatchDuration(data);
    const response = await this.dynamicService.updateData('MATCH', normalized, {
      field: 'match_id',
      value: this.id()!,
    });

    // Si el update incluye marcadores finales, evaluar predicciones
    // El servicio es idempotente: no re-evalúa si scored_at ya está seteado
    const hasScores =
      normalized.first_team_total !== undefined && normalized.second_team_total !== undefined;
    if (!(response instanceof PostgrestError) && hasScores && this.id()) {
      await this.scoringService.evaluatePredictionsForMatch(Number(this.id()));
    }

    return response;
  };

  private normalizeMatchDuration(
    data:
      | Partial<Database['public']['Tables']['MATCH']['Insert']>
      | Partial<Database['public']['Tables']['MATCH']['Update']>,
  ) {
    if (!data.start_time) return data;

    const startTime = new Date(data.start_time);
    if (Number.isNaN(startTime.getTime())) return data;

    return {
      ...data,
      end_time: new Date(startTime.getTime() + MATCH_DURATION_MINUTES * 60 * 1000).toISOString(),
    };
  }

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

    const response = await this.dynamicService.deleteData('MATCH', {
      field: 'match_id',
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
