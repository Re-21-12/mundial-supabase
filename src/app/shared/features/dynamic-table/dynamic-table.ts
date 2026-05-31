import { Component, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceInfoService } from '../../../core/services/device-info-service';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import {
  TableColumnTemplateModel,
  TableTemplateModel,
  TypeOption,
} from './interfaces/table-interface';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DynamicTableService } from './services/dynamic-table.service';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SupabaseService } from '../../../core/services/supabase-service';

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
  imports: [
    TableModule,
    PaginatorModule,
    SkeletonModule,
    ButtonModule,
    TagModule,
    DialogModule,
    FormsModule,
    CommonModule,
    SelectModule,
  ],
  templateUrl: './dynamic-table.html',
  styleUrls: ['./dynamic-table.css'],
})
export class DynamicTable {
  tableService = inject(DynamicTableService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly deviceInfo = inject(DeviceInfoService);
  delete = output<string>(); /* Para eliminar registros */
  bulkUpload = output<any[]>(); /* Emite los registros parseados para carga masiva */
  pageChange = output<{ first: number; rows: number }>(); /* Para cambios de página */

  protected readonly isMobile = signal(false);

  // Menos botones de página en mobile
  protected readonly pageLinks = computed(() => (this.isMobile() ? 3 : 5));

  // Estado para previsualización y mapeo
  parsedRows: Record<string, unknown>[] = [];
  detectedHeaders: string[] = [];
  mappings: Record<string, string | null> = {};
  previewVisible = false;
  previewHeaders: string[] = [];
  validationResults: Record<number, string[]> = {};
  readonly lookupLabels = signal<Record<string, Map<string, string>>>({});
  private readonly loadedLookupSignatures = new Map<string, string>();

  // ── Filtros ──────────────────────────────────────────────────────────────────
  protected readonly globalSearch = signal('');
  protected readonly columnFilters = signal<Record<string, string>>({});
  protected readonly filterFirst = signal(0);
  private filtersInitialized = false;

  protected readonly hasActiveFilters = computed(
    () =>
      this.globalSearch().trim().length > 0 ||
      this.tableProps().columns.some((col) => !!this.columnFilters()[col.field]?.trim()),
  );

  protected readonly filteredData = computed(() => {
    const data = this.tableProps().data as Record<string, unknown>[];
    const columns = this.tableProps().columns;
    const global = this.globalSearch().toLowerCase().trim();
    const colFilters = this.columnFilters();

    const hasGlobal = global.length > 0;
    const hasColFilter = columns.some((col) => !!colFilters[col.field]?.trim());

    if (!hasGlobal && !hasColFilter) return data;

    return data.filter((row) => {
      for (const col of columns) {
        const term = colFilters[col.field]?.trim();
        if (!term) continue;

        const inputType = this.filterInputType(col);

        if (inputType === 'date') {
          // Compare raw ISO string: date input gives YYYY-MM-DD
          if (!String(row[col.field] ?? '').startsWith(term)) return false;
          continue;
        }

        const display = this.formatCellValue(this.getDisplayCellValue(row, col)).toLowerCase();
        const lTerm = term.toLowerCase();

        if (inputType === 'boolean' || inputType === 'select') {
          // Exact match for discrete selects
          if (display !== lTerm) return false;
        } else {
          if (!display.includes(lTerm)) return false;
        }
      }

      if (hasGlobal) {
        const matchesAny = columns.some((col) => {
          const display = this.formatCellValue(this.getDisplayCellValue(row, col)).toLowerCase();
          return display.includes(global);
        });
        if (!matchesAny) return false;
      }
      return true;
    });
  });

  constructor() {
    this.deviceInfo.isMobile$.subscribe((m) => this.isMobile.set(m));

    effect(() => {
      const columns = this.tableProps().columns ?? [];
      void this.loadLookupColumns(columns);
    });

    effect(() => {
      this.globalSearch();
      this.columnFilters();
      if (this.filtersInitialized) {
        untracked(() => {
          this.filterFirst.set(0);
          this.tableService.onPageChange({ first: 0, rows: this.tableService.getPageSize() });
        });
      }
      this.filtersInitialized = true;
    });
  }

  get tableProps() {
    return this.tableService.tableProps;
  }

  get actions() {
    return this.tableProps().actions ?? ['view', 'update', 'delete'];
  }

  get rowActions() {
    return this.tableProps().rowActions ?? [];
  }

  get hasAnyAction() {
    return this.actions.length > 0 || this.rowActions.length > 0;
  }

  hasAction(action: TypeOption) {
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
      'finished',
      'finalizado',
      'finalizada',
      'draft',
      'borrador',
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
      'finished',
      'finalizado',
      'finalizada',
    ];
    const secondaryStatuses = ['draft', 'borrador'];

    if (successStatuses.includes(normalized)) {
      return 'success';
    }

    if (warnStatuses.includes(normalized)) {
      return 'warn';
    }

    if (dangerStatuses.includes(normalized)) {
      return 'danger';
    }

    if (secondaryStatuses.includes(normalized)) {
      return 'secondary';
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
    if (typeof val === 'object' && val !== null && JSON.stringify(val) === '{}') {
      return '-';
    }
    return String(val);
  }

  getDisplayCellValue(rowData: Record<string, unknown>, column: TableColumnTemplateModel): unknown {
    const rawValue = rowData[column.field];
    const translatedValue = this.translateColumnValue(column, rawValue);

    if (translatedValue !== null && translatedValue !== undefined && translatedValue !== '') {
      return translatedValue;
    }

    return rawValue;
  }

  private translateColumnValue(column: TableColumnTemplateModel, value: unknown): string | null {
    const lookup = this.lookupLabels()[column.field];
    if (!lookup || value === null || value === undefined || value === '') {
      return null;
    }

    const matched = lookup.get(String(value));
    return matched ?? null;
  }

  private async loadLookupColumns(columns: TableColumnTemplateModel[]): Promise<void> {
    const lookupColumns = columns.filter((column) => column.optionsSource);
    if (lookupColumns.length === 0) {
      return;
    }

    await Promise.all(lookupColumns.map((column) => this.loadLookupColumn(column)));
  }

  private async loadLookupColumn(column: TableColumnTemplateModel): Promise<void> {
    const source = column.optionsSource;
    if (!source) {
      return;
    }

    const signature = JSON.stringify(source);
    if (this.loadedLookupSignatures.get(column.field) === signature) {
      return;
    }

    this.loadedLookupSignatures.set(column.field, signature);

    let query = this.supabase.client.from(source.table).select('*');

    if (source.filterField && source.filterValue !== undefined) {
      query = query.eq(source.filterField, source.filterValue);
    }

    if (source.includeDeleted === false) {
      query = query.eq('is_deleted', false);
    }

    if (source.orderBy) {
      query = query.order(source.orderBy, { ascending: source.order !== 'desc' });
    }

    const { data, error } = await query;
    if (error) {
      console.error('[DynamicTable] lookup load error', column.field, source, error);
      return;
    }

    const valueField = source.valueField ?? column.field;
    const labelField = source.labelField ?? column.field;
    const nextLookup = new Map<string, string>();

    (data ?? []).forEach((item: Record<string, unknown>) => {
      const rawKey = item[valueField];
      const rawLabel = item[labelField];
      if (rawKey === null || rawKey === undefined) {
        return;
      }

      nextLookup.set(String(rawKey), this.formatCellValue(rawLabel));
    });

    this.lookupLabels.update((current) => ({
      ...current,
      [column.field]: nextLookup,
    }));
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

  onPageChange(event: { first: number; rows: number }) {
    this.filterFirst.set(event.first);
    this.tableService.onPageChange(event);
    this.pageChange.emit(event);
  }

  protected filterInputType(
    col: TableColumnTemplateModel,
  ): 'text' | 'number' | 'date' | 'boolean' | 'select' | 'image' {
    if (col.type === 'image') return 'image';
    if (col.optionsSource) return 'select';
    if (col.dataType === 'boolean') return 'boolean';
    if (col.dataType === 'date') return 'date';
    if (col.dataType === 'number') return 'number';
    return 'text';
  }

  protected getLookupOptions(col: TableColumnTemplateModel): { key: string; label: string }[] {
    const map = this.lookupLabels()[col.field];
    if (!map) return [];
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  protected setColumnFilter(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.columnFilters.update((filters) => ({ ...filters, [field]: value }));
  }

  protected setColumnFilterValue(field: string, value: string): void {
    this.columnFilters.update((f) => ({ ...f, [field]: value }));
  }

  protected clearAllFilters(): void {
    this.globalSearch.set('');
    this.columnFilters.set({});
  }

  /** Manejo del input de archivo desde la plantilla */
  async handleFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    try {
      const rows = await this.parseFileToObjects(file);
      this.openPreview(rows);
    } catch (err) {
      console.error('Error parseando archivo:', err);
      alert('Error al procesar el archivo. Revisa el formato y vuelve a intentarlo.');
    } finally {
      // limpiar input para permitir recarga del mismo archivo si es necesario
      input.value = '';
    }
  }

  private async parseFileToObjects(file: File): Promise<Record<string, unknown>[]> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) {
      const text = await file.text();
      return this.parseDelimitedText(text);
    }

    // Intentar XLSX mediante import dinámico de sheetjs; si no está instalado, lanzar error amigable
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
      try {
        const XLSX = await import(/* webpackIgnore: true */ 'xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];
        return json;
      } catch (e) {
        throw new Error('Librería XLSX no disponible. Ejecuta `npm install xlsx` o sube CSV/TSV.');
      }
    }

    throw new Error('Formato de archivo no soportado. Usa .csv, .tsv, .txt, .xls o .xlsx');
  }

  private parseDelimitedText(text: string): Record<string, unknown>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Detectar separador: tab, comma, semicolon
    const first = lines[0];
    let sep = ',';
    if (first.indexOf('\t') >= 0) sep = '\t';
    else if (first.indexOf(';') >= 0) sep = ';';

    const headers = lines[0].split(sep).map((h) => h.trim());
    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep);
      const row: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cols[j] !== undefined ? cols[j].trim() : null;
      }
      rows.push(row);
    }
    return rows;
  }

  private openPreview(rows: Record<string, unknown>[]) {
    this.parsedRows = rows;
    this.detectedHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
    // inicializar mappings (por defecto mapear por nombre idéntico)
    this.mappings = {};
    for (const col of this.tableProps().columns) {
      const field = col.field;
      const match = this.detectedHeaders.find((h) => h.toLowerCase() === field.toLowerCase());
      this.mappings[field] = match ?? null;
    }
    this.previewHeaders = this.detectedHeaders.slice();
    this.runValidation();
    this.previewVisible = true;
  }

  canConfirm(): boolean {
    // verificar que todos los campos requeridos estén mapeados y que no haya errores críticos
    const requiredMissing = this.tableProps()
      .columns.filter((c: any) => c.required)
      .some((c: any) => !this.mappings[c.field]);
    if (requiredMissing) return false;
    // No permitir confirmación si hay errores en las primeras filas
    const hasErrors = Object.values(this.validationResults).some((errs) => errs && errs.length > 0);
    return !hasErrors;
  }

  private runValidation() {
    this.validationResults = {};
    const schemaFromProps = this.tableProps().dbSchema ?? {};
    const columns = this.tableProps().columns;
    for (let i = 0; i < this.parsedRows.length; i++) {
      const row = this.parsedRows[i];
      const rowErrors: string[] = [];
      for (const col of columns) {
        const field = col.field;
        const mapped = this.mappings[field];
        if (!mapped) {
          if (col.required) rowErrors.push(`${field} no mapeado`);
          continue;
        }
        const val = row[mapped];
        const expected = col.dataType ?? schemaFromProps[field] ?? this.inferTypeFromName(field);
        const err = this.validateValue(val, expected, field);
        if (err) rowErrors.push(err);
      }
      this.validationResults[i] = rowErrors;
    }
  }

  private inferTypeFromName(field: string): 'string' | 'number' | 'boolean' | 'date' | 'any' {
    if (field.endsWith('_id') || field === 'id' || field.endsWith('Id')) return 'number';
    if (field.endsWith('_at') || field.includes('date') || field.includes('Date')) return 'date';
    if (field.startsWith('is_') || field.startsWith('has_') || field.startsWith('is'))
      return 'boolean';
    return 'string';
  }

  private validateValue(val: unknown, expected: string, field: string): string | null {
    if (val === null || val === undefined || String(val).trim() === '') {
      return null; // aceptar vacío, si es requerido ya se chequea mapeo
    }
    const s = String(val).trim();
    switch (expected) {
      case 'number':
        if (!/^-?\d+$/.test(s)) return `${field} debe ser entero`;
        return null;
      case 'date':
        if (isNaN(Date.parse(s))) return `${field} fecha inválida`;
        return null;
      case 'boolean':
        if (!/^(true|false|si|no|1|0|activo|inactivo)$/i.test(s))
          return `${field} boolean inválido`;
        return null;
      default:
        return null;
    }
  }

  confirmImport() {
    // convertir y emitir los objetos mapeados aplicando tipos
    const finalObjs: Record<string, unknown>[] = [];
    for (const row of this.parsedRows) {
      const obj: Record<string, unknown> = {};
      for (const col of this.tableProps().columns) {
        const field = col.field;
        const mapped = this.mappings[field];
        if (!mapped) continue;
        const raw = row[mapped];
        const expected =
          col.dataType ?? this.tableProps().dbSchema?.[field] ?? this.inferTypeFromName(field);
        obj[field] = this.castValue(raw, expected);
      }
      finalObjs.push(obj);
    }
    this.bulkUpload.emit(finalObjs);
    this.previewVisible = false;
    // limpiar estado
    this.parsedRows = [];
    this.detectedHeaders = [];
    this.mappings = {};
    this.previewHeaders = [];
    this.validationResults = {};
  }

  private castValue(raw: unknown, expected: string) {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    switch (expected) {
      case 'number':
        return parseInt(s, 10);
      case 'date':
        return new Date(s).toISOString();
      case 'boolean':
        return /^(true|si|1|activo)$/i.test(s);
      default:
        return s;
    }
  }
}
