import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../../core/services/supabase-service';
import { FieldOptionSource } from '../interfaces/field-props';

export interface CatalogOption {
  key: string | number;
  value: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogOptionsService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly optionsByField = signal<Record<string, CatalogOption[]>>({});
  private readonly loadedSources = new Set<string>();

  getOptions(fieldKey: string): CatalogOption[] {
    return this.optionsByField()[fieldKey] ?? [];
  }

  async loadOptions(fieldKey: string, source: FieldOptionSource): Promise<void> {
    const cacheKey = `${fieldKey}:${JSON.stringify(source)}`;
    if (this.loadedSources.has(cacheKey)) {
      return;
    }

    const valueField = source.valueField ?? 'catalog_id';
    const labelField = source.labelField ?? 'description';
    const orderBy = source.orderBy ?? labelField;
    const order = source.order ?? 'asc';

    let query = this.supabaseService.client
      .from(source.table)
      .select('*')
      .order(orderBy, { ascending: order === 'asc' });

    if (source.filterField && source.filterValue !== undefined && source.filterValue !== null) {
      query = query.eq(source.filterField, source.filterValue);
    }

    if (!source.includeDeleted) {
      query = query.is('is_deleted', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading catalog options:', error);
      return;
    }

    const options = (data ?? [])
      .map((item) => {
        const key = item?.[valueField];
        const value = item?.[labelField];

        if (key === undefined || key === null) {
          return null;
        }

        return {
          key,
          value: String(value ?? key),
        };
      })
      .filter((option): option is CatalogOption => option !== null);

    this.optionsByField.update((current) => ({
      ...current,
      [fieldKey]: options,
    }));
    this.loadedSources.add(cacheKey);
  }

  clearOptions(fieldKey: string): void {
    this.optionsByField.update((current) => {
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  }
}
