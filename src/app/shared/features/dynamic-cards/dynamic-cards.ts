import { Component, inject, output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DynamicTableService } from '../dynamic-table/services/dynamic-table.service';
import { TypeOption } from '../dynamic-table/interfaces/table-interface';

@Component({
  selector: 'app-dynamic-cards',
  imports: [CardModule, CommonModule, ButtonModule],
  templateUrl: './dynamic-cards.html',
  styleUrl: './dynamic-cards.css',
})
export class DynamicCards {
  tableService = inject(DynamicTableService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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

    this.router.navigate([rowId], { relativeTo: this.route });
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
    const canDelete = window.confirm(`Deseas eliminar el registro${rowId ? ` ${rowId}` : ''}?`);
    if (!canDelete) {
      return;
    }

    // Placeholder: la eliminacion real debe quedar en la pagina/servicio correspondiente.
    console.log('Delete action requested:', rowData);
  }
}
