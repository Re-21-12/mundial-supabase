export interface DynamicQuery {
  table: string;
  filters?: DynamicQueryFilter | DynamicQueryFilter[];
  order: 'asc' | 'desc';
  limit: number;
  page: number;
  columns: string; // Ej 'nombre, posicion' df: '*'
}
export interface DynamicQueryFilter {
  field: string;
  value: string;
  operator?: 'eq' | 'gte' | 'lte' | 'ilike';
}
