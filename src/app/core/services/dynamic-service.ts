import { inject, Injectable, Injector } from '@angular/core';
import { SupabaseService } from './supabase-service';
import { DynamicQuery, DynamicQueryFilter } from '../interfaces/dynamic-query-interface';
import { PostgrestError } from '@supabase/supabase-js';
import { AuthFacade } from '../../shared/features/auth/auth.facade';
import { NotificationService } from '../../shared/services/notification-service';

@Injectable({
  providedIn: 'root',
})
export class DynamicService {
  items: any[] = [];
  supabaseService = inject(SupabaseService);
  private injector = inject(Injector);
  private readonly notifier = inject(NotificationService);

  async fetchData<T>(
    query: DynamicQuery,
  ): Promise<(T[] & { totalRecords?: number }) | PostgrestError> {
    const from = query.page * query.limit;
    const to = from + query.limit - 1;
    const { table, order } = query;
    let fetchedData: any[] | null = null;
    let error: PostgrestError | null = null;
    let totalRecords: number | null = null;

    const filters = Array.isArray(query.filters)
      ? query.filters
      : query.filters
        ? [query.filters]
        : [];

    const applyFilters = (builder: any) => {
      for (const filter of filters) {
        switch (filter.operator) {
          case 'gte':
            builder = builder.gte(filter.field, filter.value);
            break;
          case 'lte':
            builder = builder.lte(filter.field, filter.value);
            break;
          case 'ilike':
            builder = builder.ilike(filter.field, filter.value);
            break;
          default:
            builder = builder.eq(filter.field, filter.value);
            break;
        }
      }

      return builder;
    };

    if (filters.length > 0) {
      ({
        data: fetchedData,
        error,
        count: totalRecords,
      } = await applyFilters(
        this.supabaseService.client
          .from(`${table}`)
          .select(query.columns, { count: 'exact' })
          .order('created_at', { ascending: order === 'desc' })
          .range(from, to),
      ));
    } else {
      ({
        data: fetchedData,
        error,
        count: totalRecords,
      } = await this.supabaseService.client
        .from(`${table}`)
        .select(query.columns, { count: 'exact' }) // Seleccionar las columnas especificadas
        // .eq('country', 'Argentina') // Columna y valor a buscar
        .order('created_at', { ascending: order === 'asc' }) // Ordenar por la columna 'id' de forma ascendente o descendente
        // .limit(10); // Limitar a 10 resultados
        .range(from, to));
    }

    if (error) {
      console.error('Error fetching teams:', error);
      return error;
    } else {
      const result = (fetchedData as T[]) || [];
      if (totalRecords !== null) {
        Object.assign(result, { totalRecords });
      }
      return result as T[] & { totalRecords?: number };
    }
  }
  async insertData<T>(table: string, data: Partial<T>): Promise<T | PostgrestError> {
    const { data: insertedRecord, error } = await this.supabaseService.client
      .from(table) // No necesitas `${table}`, con la variable basta
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error inserting data:', error);
      this.notifier.notify('error', 'No se pudo guardar', this.getErrorDetail(error));
      return error;
    } else {
      console.log('Data inserted successfully:', insertedRecord);
      this.notifier.notify('success', 'Guardado', 'El registro se guardó correctamente.');
    }

    return insertedRecord as T;
  }
  async updateData<T>(
    table: string,
    data: Partial<T>,
    filter: DynamicQueryFilter,
  ): Promise<T | PostgrestError> {
    const { field, value } = filter;
    const { data: updatedRecord, error } = await this.supabaseService.client
      .from(table) // No necesitas `${table}`, con la variable basta
      .update(data)
      .select()
      .eq(field, value)
      .single();

    if (error) {
      console.error('Error updating data:', error);
      this.notifier.notify('error', 'No se pudo actualizar', this.getErrorDetail(error));
      return error;
    } else {
      console.log('Data updated successfully:', updatedRecord);
      this.notifier.notify('success', 'Actualizado', 'El registro se actualizó correctamente.');
    }

    return updatedRecord as T;
  }

  async deleteData<T>(
    table: string,
    filter: DynamicQueryFilter,
    deletedBy?: string | number,
  ): Promise<T | PostgrestError> {
    const { field, value } = filter;
    const payload: any = {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    };
    if (deletedBy !== undefined && deletedBy !== null) payload.deleted_by = deletedBy;

    const { data: deletedRecord, error } = await this.supabaseService.client
      .from(table) // No necesitas `${table}`, con la variable basta
      .update(payload)
      .select()
      .eq(field, value)
      .single();

    if (error) {
      console.error('Error deleting data:', error);
      this.notifier.notify('error', 'No se pudo eliminar', this.getErrorDetail(error));
      return error;
    } else {
      console.log('Data deleted successfully:', deletedRecord);
      this.notifier.notify('success', 'Eliminado', 'El registro se eliminó correctamente.');
    }

    return deletedRecord as T;
  }
  /* Obtener CSV */
  async exportToCSV(): Promise<string | Error> {
    const { data: csvData, error } = await this.supabaseService.client
      .from('TEAM')
      .select('*') // Seleccionar todas las columnas
      .csv();
    if (error) {
      console.error('Error exporting teams to CSV:', error);
      return error;
    } else {
      return csvData;
    }
    /* modifiers se obtienen despues de hacer la consulta, filtros o paginacion
     */
  }
  /*
npx supabase gen types typescript --project-id mwflkwazlhvrtckbbkpi > src/app/types/database.types.ts
*/

  private getErrorDetail(error: PostgrestError): string {
    return error.message || 'Ocurrió un error inesperado.';
  }
}
