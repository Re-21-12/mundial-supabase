export interface DynamicQuery {
  table: string;
  //filters?: { [key: string]: any
  order: 'asc' | 'desc';
  limit: number;
  page: number;
}
