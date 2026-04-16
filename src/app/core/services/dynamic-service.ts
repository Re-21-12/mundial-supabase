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

  async fetchData(query: DynamicQuery): Promise<any[] | PostgrestError> {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.

    const from = query.page * query.limit;
    const to = from + query.limit - 1;
    const { table, order } = query;

    const { data, error } = await this.supabaseService.client
      .from(`${table}`)
      .select('*') // Seleccionar todas las columnas
      // .eq('country', 'Argentina') // Columna y valor a buscar
      .order('created_by', { ascending: order === 'asc' }) // Ordenar por la columna 'id' de forma ascendente o descendente
      // .limit(10); // Limitar a 10 resultados
      .range(from, to);
    if (error) {
      console.error('Error fetching teams:', error);
      return error;
    } else {
      return data || [];
    }
  }
  /* Obtener CSV */
  async exportToCSV(): Promise<string | Error> {
    const { data, error } = await this.supabaseService.client
      .from('TEAM')
      .select('*') // Seleccionar todas las columnas
      .csv();
    if (error) {
      console.error('Error exporting teams to CSV:', error);
      return error;
    } else {
      return data;
    }
    /* modifiers se obtienen despues de hacer la consulta, filtros o paginacion
     */
  }
  /*
npx supabase gen types typescript --project-id mwflkwazlhvrtckbbkpi > src/app/types/database.types.ts
*/
}
