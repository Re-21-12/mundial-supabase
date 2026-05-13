import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase-service';

export type SearchResult = {
  entity_type: 'league' | 'user' | 'team';
  entity_id: number;
  label: string;
  sublabel: string | null;
};

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly _db = inject(SupabaseService);

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim() || query.length < 2) return [];

    const { data, error } = await this._db.client
      .rpc('fn_global_search', { q: query.trim() });

    if (error) {
      console.error('[Search]', error);
      return [];
    }
    return (data as SearchResult[]) ?? [];
  }
}
