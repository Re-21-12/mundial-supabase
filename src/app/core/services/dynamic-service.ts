import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';
import { DynamicQuery, DynamicQueryFilter } from '../interfaces/dynamic-query-interface';
import { PostgrestError } from '@supabase/supabase-js';
import { AuthFacade } from '../../shared/features/auth/auth.facade';

@Injectable({
  providedIn: 'root',
})
export class DynamicService {
  items: any[] = [];
  supabaseService = inject(SupabaseService);
  authFacade = inject(AuthFacade);

  async fetchData<T>(query: DynamicQuery): Promise<T[] | PostgrestError> {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

    const from = query.page * query.limit;
    const to = from + query.limit - 1;
    const { table, order, filters } = query;
    let fetchedData: any[] | null = null;
    let error: PostgrestError | null = null;

    if (filters) {
      ({ data: fetchedData, error } = await this.supabaseService.client
        .from(`${table}`)
        .select(query.columns) // Seleccionar las columnas especificadas
        .eq(filters.field, filters.value) // Columna y valor a buscar
        .order('created_at', { ascending: order === 'asc' }) // Ordenar por la columna 'id' de forma ascendente o descendente
        // .limit(10); // Limitar a 10 resultados
        .range(from, to));
    } else {
      ({ data: fetchedData, error } = await this.supabaseService.client
        .from(`${table}`)
        .select(query.columns) // Seleccionar las columnas especificadas
        // .eq('country', 'Argentina') // Columna y valor a buscar
        .order('created_at', { ascending: order === 'asc' }) // Ordenar por la columna 'id' de forma ascendente o descendente
        // .limit(10); // Limitar a 10 resultados
        .range(from, to));
    }

    if (error) {
      console.error('Error fetching teams:', error);
      return error;
    } else {
      return (fetchedData as T[]) || [];
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
      return error;
    } else {
      console.log('Data inserted successfully:', insertedRecord);
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
      return error;
    } else {
      console.log('Data updated successfully:', updatedRecord);
    }

    return updatedRecord as T;
  }

  async deleteData<T>(table: string, filter: DynamicQueryFilter): Promise<T | PostgrestError> {
    const { field, value } = filter;
    const { data: deletedRecord, error } = await this.supabaseService.client
      .from(table) // No necesitas `${table}`, con la variable basta
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: this.authFacade.internalUserId,
      })
      .select()
      .eq(field, value)
      .single();

    if (error) {
      console.error('Error deleting data:', error);
      return error;
    } else {
      console.log('Data deleted successfully:', deletedRecord);
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
}
