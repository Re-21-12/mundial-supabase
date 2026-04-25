export interface DynamicQuery {
  table: string;
  filters?: { field: string; value: string };
  order: 'asc' | 'desc';
  limit: number;
  page: number;
  columns: string; // Ej 'nombre, posicion' df: '*'
}
export interface DynamicQueryFilter {
  field: string;
  value: string;
}
