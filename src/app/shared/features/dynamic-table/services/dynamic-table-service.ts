import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../../core/api/services/supabase-service';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  table: string;
  order: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class DynamicTableService {
  private supabase = inject(SupabaseService);

  // Usamos signals para que la UI reaccione automáticamente
  public items = signal<any[]>([]);
  public state = signal<PaginationState>({
    page: 0,
    limit: 10,
    total: 0,
    table: '',
    order: 'desc',
  });

  async fetchData<T>(
    table: string,
    page: number = 0,
    limit: number = 10,
    order: 'asc' | 'desc' = 'desc',
  ) {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase.client
      .from(table)
      .select('*', { count: 'exact' })
      .order('id', { ascending: order === 'asc' })
      .range(from, to);

    if (error) {
      console.error(`Error en tabla ${table}:`, error);
      return;
    }

    // Actualizamos los signals
    this.items.set(data as T[]);
    this.state.update((s) => ({ ...s, table, page, limit, total: count || 0, order }));
  }

  // Métodos de ayuda para la UI
  async nextPage() {
    const s = this.state();
    if ((s.page + 1) * s.limit < s.total) {
      await this.fetchData(s.table, s.page + 1, s.limit, s.order);
    }
  }

  async prevPage() {
    const s = this.state();
    if (s.page > 0) {
      await this.fetchData(s.table, s.page - 1, s.limit, s.order);
    }
  }
}
