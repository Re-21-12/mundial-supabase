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
}
export interface TableColumnTemplateModel {
  field: string;
  header: string;
}
interface ExportColumn {
  title: string;
  dataKey: string;
}
export type TypeOption = 'view' | 'update' | 'delete' | 'insert';
