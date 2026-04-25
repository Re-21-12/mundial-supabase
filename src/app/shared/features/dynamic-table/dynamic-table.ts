import { Component, inject, input, output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TableTemplateModel } from './interfaces/table-interface';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

const PRIME_NG = [TableModule, PaginatorModule, SkeletonModule, ButtonModule, TagModule];
type BadgeSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;
@Component({
  selector: 'app-dynamic-table',
  imports: PRIME_NG,
  templateUrl: './dynamic-table.html',
  styleUrl: './dynamic-table.css',
})
export class DynamicTable {
  tableProps = input.required<TableTemplateModel>();
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  delete = output<string>(); /* Para eliminar registros */

  get actions() {
    return this.tableProps().actions ?? ['view', 'update', 'delete'];
  }

  hasAction(action: 'view' | 'update' | 'delete') {
    return this.actions.includes(action);
  }

  /** Detecta si un valor es booleano (true/false) */
  isBoolean(val: unknown): val is boolean {
    return typeof val === 'boolean';
  }

  /** Detecta si un valor es un string con formato de fecha/hora ISO 8601 */
  isDate(val: unknown): val is string {
    if (typeof val !== 'string' || val.length < 10) return false;
    return /^\d{4}-\d{2}-\d{2}(T|\s)/.test(val);
  }

  isStatusString(val: unknown): val is string {
    if (typeof val !== 'string') {
      return false;
    }

    const normalized = val.trim().toLowerCase();
    const knownStatuses = new Set([
      'active',
      'activo',
      'enabled',
      'habilitado',
      'approved',
      'aprobado',
      'completed',
      'completado',
      'paid',
      'pagado',
      'pending',
      'pendiente',
      'inactive',
      'inactivo',
      'disabled',
      'deshabilitado',
      'rejected',
      'rechazado',
      'cancelled',
      'cancelado',
      'error',
      'failed',
      'fallido',
    ]);

    return knownStatuses.has(normalized);
  }

  /** Formatea una fecha ISO a un formato legible */
  formatDate(val: string): string {
    try {
      const date = new Date(val);
      return new Intl.DateTimeFormat('es-GT', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return val;
    }
  }

  shouldRenderAsBadge(val: unknown): boolean {
    return this.isBoolean(val) || this.isStatusString(val);
  }

  getBadgeLabel(val: unknown): string {
    if (this.isBoolean(val)) {
      return val ? 'Si' : 'No';
    }

    return this.formatCellValue(val);
  }

  getBadgeSeverity(val: unknown): BadgeSeverity {
    if (this.isBoolean(val)) {
      return val ? 'success' : 'danger';
    }

    if (!this.isStatusString(val)) {
      return 'secondary';
    }

    const normalized = val.trim().toLowerCase();
    const successStatuses = [
      'active',
      'activo',
      'enabled',
      'habilitado',
      'approved',
      'aprobado',
      'completed',
      'completado',
      'paid',
      'pagado',
    ];
    const warnStatuses = ['pending', 'pendiente'];
    const dangerStatuses = [
      'inactive',
      'inactivo',
      'disabled',
      'deshabilitado',
      'rejected',
      'rechazado',
      'cancelled',
      'cancelado',
      'error',
      'failed',
      'fallido',
    ];

    if (successStatuses.includes(normalized)) {
      return 'success';
    }

    if (warnStatuses.includes(normalized)) {
      return 'warn';
    }

    if (dangerStatuses.includes(normalized)) {
      return 'danger';
    }

    return 'secondary';
  }

  formatCellValue(val: unknown): string {
    if (val === null || val === undefined || val === '') {
      return '-';
    }

    if (this.isDate(val)) {
      return this.formatDate(val);
    }

    if (this.isBoolean(val)) {
      return val ? 'Si' : 'No';
    }

    return String(val);
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
      this.router.navigate([routeBase, rowId, 'detail']);
      return;
    }

    this.router.navigate([rowId, 'detail'], { relativeTo: this.route });
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

    this.router.navigate([rowId, 'edit'], { relativeTo: this.route });
  }

  onDelete(rowData: Record<string, unknown>) {
    const rowId = this.resolveRowId(rowData);
    // const canDelete = window.confirm(`Deseas eliminar el registro${rowId ? ` ${rowId}` : ''}?`);
    // if (!canDelete) {
    //   return;
    // }
    this.delete.emit(rowId!);
    // Placeholder: la eliminacion real debe quedar en la pagina/servicio correspondiente.
    console.log('Delete action requested:', rowData);
  }
}
