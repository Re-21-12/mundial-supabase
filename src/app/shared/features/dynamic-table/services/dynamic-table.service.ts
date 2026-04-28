import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { TableTemplateModel, TypeOption } from '../interfaces/table-interface';

@Injectable()
export class DynamicTableService {
  // Estado de la tabla
  private tableData = signal<any[]>([]);
  private currentPage = signal<number>(0);
  private pageSize = signal<number>(10);
  private rowsPerPageOptions = signal<number[]>([5, 10, 20]);
  private columns = signal<any[]>([]);
  private header = signal<string>('');
  private routeBase = signal<string | undefined>(undefined);
  private rowIdField = signal<string | undefined>(undefined);
  private actions = signal<TypeOption[]>(['view', 'update', 'delete']);

  // Estado computado
  tableProps = computed(
    () =>
      ({
        header: this.header(),
        columns: this.columns(),
        rows: this.pageSize(),
        rowsPerPageOptions: this.rowsPerPageOptions(),
        data: this.tableData(),
        routeBase: this.routeBase(),
        rowIdField: this.rowIdField(),
        actions: this.actions(),
      }) as TableTemplateModel,
  );

  constructor() {}

  /**
   * Inicializa la tabla con propiedades
   */
  initTable(props: Partial<TableTemplateModel>) {
    if (props.header) this.header.set(props.header);
    if (props.columns) this.columns.set(props.columns);
    if (props.rows) this.pageSize.set(props.rows);
    if (props.rowsPerPageOptions) this.rowsPerPageOptions.set(props.rowsPerPageOptions);
    if (props.data) this.tableData.set(props.data);
    if (props.routeBase) this.routeBase.set(props.routeBase);
    if (props.rowIdField) this.rowIdField.set(props.rowIdField);
    if (props.actions) this.actions.set(props.actions);
  }

  /**
   * Actualiza los datos de la tabla
   */
  setData(data: any[]) {
    this.tableData.set(data);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(event: { first: number; rows: number }) {
    const page = Math.floor(event.first / event.rows);
    this.currentPage.set(page);
    this.pageSize.set(event.rows);
  }

  /**
   * Obtiene la página actual
   */
  getCurrentPage(): number {
    return this.currentPage();
  }

  /**
   * Obtiene el tamaño de página
   */
  getPageSize(): number {
    return this.pageSize();
  }

  /**
   * Obtiene los datos actuales
   */
  getData(): any[] {
    return this.tableData();
  }

  /**
   * Limpia el servicio
   */
  reset() {
    this.tableData.set([]);
    this.currentPage.set(0);
    this.pageSize.set(10);
  }
}
