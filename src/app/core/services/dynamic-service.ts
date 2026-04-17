import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';
import { DynamicQuery } from '../interfaces/dynamic-query-interface';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class DynamicService {
  items: any[] = [];
  supabaseService = inject(SupabaseService);

  async fetchData<T>(query: DynamicQuery): Promise<T[] | PostgrestError> {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

    const from = query.page * query.limit;
    const to = from + query.limit - 1;
    const { table, order } = query;

    const { data: fetchedData, error } = await this.supabaseService.client
      .from(`${table}`)
      .select(query.columns) // Seleccionar las columnas especificadas
      // .eq('country', 'Argentina') // Columna y valor a buscar
      .order('created_by', { ascending: order === 'asc' }) // Ordenar por la columna 'id' de forma ascendente o descendente
      // .limit(10); // Limitar a 10 resultados
      .range(from, to);
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
    }

    return insertedRecord as T;
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
