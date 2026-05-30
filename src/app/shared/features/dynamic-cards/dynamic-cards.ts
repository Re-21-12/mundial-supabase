import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { DynamicTableService } from '../dynamic-table/services/dynamic-table.service';
import { TypeOption } from '../dynamic-table/interfaces/table-interface';

@Component({
  selector: 'app-dynamic-cards',
  imports: [],
  templateUrl: './dynamic-cards.html',
  styleUrl: './dynamic-cards.css',
})
export class DynamicCards {
  tableService = inject(DynamicTableService);
  private readonly router = inject(Router);
  delete = output<string>();
  pageChange = output<{ first: number; rows: number }>();

  get tableProps() {
    return this.tableService.tableProps;
  }

  get actions() {
    return this.tableProps().actions ?? ['view', 'update', 'delete'];
  }

  hasAction(action: TypeOption) {
    return this.actions.includes(action);
  }

  resolveRowId(rowData: Record<string, unknown>) {
    const preferredIdField = this.tableProps().rowIdField;
    if (
      preferredIdField &&
      rowData[preferredIdField] !== undefined &&
      rowData[preferredIdField] !== null
    ) {
      return String(rowData[preferredIdField]);
    }

    const idField = Object.keys(rowData).find((key) => key.endsWith('_id'));
    if (!idField) {
      return null;
    }

    const value = rowData[idField];
    if (value === undefined || value === null) {
      return null;
    }

    return String(value);
  }

  goToDetail(rowData: Record<string, unknown>) {
    const rowId = this.resolveRowId(rowData);
    if (!rowId) {
      console.warn('No se encontro un id valido para detalle.');
      return;
    }

    const routeBase = this.tableProps().routeBase;
    if (routeBase) {
      this.router.navigate([routeBase, rowId]);
      return;
    }

    this.router.navigateByUrl(`${this._basePath()}/${rowId}`);
  }

  goToEdit(rowData: Record<string, unknown>) {
    const rowId = this.resolveRowId(rowData);
    if (!rowId) {
      console.warn('No se encontro un id valido para editar.');
      return;
    }

    const routeBase = this.tableProps().routeBase;
    if (routeBase) {
      this.router.navigate([routeBase, rowId, 'edit']);
      return;
    }

    this.router.navigateByUrl(`${this._basePath()}/${rowId}/edit`);
  }

  /** Derives the absolute base path from the current URL, stripping any id/action segments. */
  private _basePath(): string {
    const segments = this.router.url
      .split('?')[0]
      .split('/')
      .filter((s) => s.length > 0 && s !== 'edit' && s !== 'detail');

    // Remove a trailing numeric id (e.g. /league/123 → /league)
    if (segments.length > 0 && /^\d+$/.test(segments[segments.length - 1])) {
      segments.pop();
    }

    return '/' + segments.join('/');
  }

  onDelete(rowData: Record<string, unknown>) {
    const rowId = this.resolveRowId(rowData);
    const canDelete = window.confirm(`Deseas eliminar el registro${rowId ? ` ${rowId}` : ''}?`);
    if (!canDelete) {
      return;
    }

    // Placeholder: la eliminacion real debe quedar en la pagina/servicio correspondiente.
    console.log('Delete action requested:', rowData);
  }
}
