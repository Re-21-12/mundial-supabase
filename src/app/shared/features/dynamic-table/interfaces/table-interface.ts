export interface RowAction {
  icon: string;
  label: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';
  action: (row: Record<string, unknown>) => void;
}

export interface TableTemplateModel {
  header: string;
  columns: TableColumnTemplateModel[];
  rows: number;
  rowsPerPageOptions: number[];
  data: any[];
  totalRecords?: number;
  customExportHeader?: string;
  actions?: TypeOption[];
  routeBase?: string;
  rowIdField?: string;
  rowActions?: RowAction[];
  /** Optional runtime schema: field -> data type ('string'|'number'|'boolean'|'date'|'any') */
  dbSchema?: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'any'>;
}
export interface TableColumnTemplateModel {
  field: string;
  header: string;
  type?: 'text' | 'image' | 'badge';
  /** Optional: expected data type for this column */
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'any';
  /** Optional: whether this column is required during bulk import */
  required?: boolean;
}
interface ExportColumn {
  title: string;
  dataKey: string;
}
export type TypeOption = 'view' | 'update' | 'delete' | 'insert';
