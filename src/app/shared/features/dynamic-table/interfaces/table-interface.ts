export interface TableTemplateModel {
  header: string;
  columns: TableColumnTemplateModel[];
  rows: number;
  rowsPerPageOptions: number[];
  data: any[];
  customExportHeader?: string;
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
