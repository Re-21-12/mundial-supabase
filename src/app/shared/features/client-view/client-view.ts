import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase-service';
import { DynamicTableService } from '../dynamic-table/services/dynamic-table.service';
import { SelectedDisplay } from '../selected-display/selected-display';

export interface ClientViewConfig {
  table: string;
  header: string;
  columns: { field: string; header: string; type?: 'image' }[];
  /** Filtro opcional: { field, value } para mostrar solo los registros del usuario */
  filter?: { field: string; value: unknown };
}

@Component({
  selector: 'app-client-view',
  imports: [SelectedDisplay],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-semibold mb-4">{{ config?.header }}</h2>
      <app-selected-display (pageChange)="onPageChange($event)" />
    </div>
  `,
  providers: [DynamicTableService],
})
export class ClientViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly db = inject(SupabaseService);
  readonly tableService = inject(DynamicTableService);

  config: ClientViewConfig | null = null;

  async ngOnInit() {
    this.config = (this.route.snapshot.data['clientConfig'] ?? null) as ClientViewConfig | null;
    if (!this.config) return;

    this.tableService.initTable({
      header: this.config.header,
      columns: this.config.columns,
      rows: 10,
      rowsPerPageOptions: [5, 10, 20],
      actions: [],
    });

    await this.load(0, 10);
  }

  async onPageChange(event: { first: number; rows: number }) {
    this.tableService.onPageChange(event);
    const page = Math.floor(event.first / event.rows);
    await this.load(page, event.rows);
  }

  private async load(page: number, pageSize: number) {
    if (!this.config) return;

    let query = this.db.client
      .from(this.config.table as any)
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (this.config.filter) {
      query = (query as any).eq(this.config.filter.field, this.config.filter.value);
    }

    const { data, count, error } = await (query as any);
    if (error) {
      console.error(`[ClientView] Error loading ${this.config.table}:`, error);
      return;
    }

    const result = data ?? [];
    (result as any).totalRecords = count ?? result.length;
    this.tableService.setData(result);
  }
}
