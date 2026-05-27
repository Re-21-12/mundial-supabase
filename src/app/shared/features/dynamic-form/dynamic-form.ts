import { Component, input, computed, effect, inject, output } from '@angular/core';
import { Button } from 'primeng/button';
import { formFields } from './utils/forms';
import { FieldBase } from './interfaces/field-props';
import { DynamicField } from './dynamic-field/dynamic-field';
import { FormGroup, FormArray } from '@angular/forms';
import { FormBuilderService } from './services/form-builder.service';
import { TooltipModule } from 'primeng/tooltip';
import { HttpLoadingService } from '../../../core/services/http-loading-service';
import { CatalogOption, CatalogOptionsService } from './services/catalog-options.service';
import { TypeFields } from './enums/type-fields';
@Component({
  selector: 'app-dynamic-form',
  imports: [DynamicField, Button, TooltipModule],
  templateUrl: './dynamic-form.html',
  styleUrls: ['./dynamic-form.css'],
})
export class DynamicForm {
  data = output<string>();

  private readonly _fb = inject(FormBuilderService);
  readonly loadingService = inject(HttpLoadingService);
  private readonly catalogOptionsService = inject(CatalogOptionsService);

  readonly fields = input<FieldBase<string>[] | null>([]);
  readonly initialData = input<Record<string, any> | null>(null);
  readonly readonlyMode = input<boolean>(false);

  readonly form = computed<FormGroup>(() =>
    this._fb.toFormGroup(this.fields() as FieldBase<string>[]),
  );

  payLoad = '';
  private hydratedInitialDataSignature: string | null = null;

  constructor() {
    // Modo edición: parchea los valores del form cuando llega initialData
    effect(() => {
      const data = this.initialData();
      if (data) {
        const signature = JSON.stringify(data);
        if (signature === this.hydratedInitialDataSignature) {
          console.debug('[DynamicForm] initialData skipped (same signature)', data);
          return;
        }

        this.hydratedInitialDataSignature = signature;
        console.debug('[DynamicForm] initialData received', data);
        this.form().patchValue(this.normalizeInitialData(data));
        this.normalizeSelectableFields();
      }
    });

    // Modo consulta: deshabilita o habilita todos los controles
    effect(() => {
      const isReadonly = this.readonlyMode();
      const form = this.form();
      Object.values(form.controls).forEach((ctrl) =>
        isReadonly ? ctrl.disable({ emitEvent: false }) : ctrl.enable({ emitEvent: false }),
      );
    });

    effect(() => {
      const fields = this.fields() ?? [];

      fields.forEach((field) => {
        if (field.optionsSource) {
          console.debug('[DynamicForm] loading options for field', field.key, field.optionsSource);
          void this.catalogOptionsService.loadOptions(field.key, field.optionsSource);
        }

        if (this.isSelectableField(field)) {
          this.syncSelectableFieldValue(field);
        }
      });
    });
  }

  // Función para determinar las clases de grid según el número de campos
  gridClasses = computed(() => {
    const fieldCount = this.fields()?.length || 0;

    if (fieldCount === 0) {
      return '';
    } else if (fieldCount === 1 || fieldCount === 2) {
      // 1 o 2 campos: siempre en columna
      return 'grid grid-cols-1 gap-6';
    } else {
      // Más de 2 campos -> 2 columnas en desktop, 1 en móvil
      return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    }
  });

  // Método para manejar el envío del formulario
  onSubmit() {
    if (!this.form().valid) return;
    const payload = this.serializeFormValue(this.form().value) as Record<string, unknown>;
    this.payLoad = JSON.stringify(payload);
    console.log('Datos:', this.payLoad);
    console.log('Datos JSON', payload);
    this.data.emit(this.payLoad);
  }

  // Método para limpiar el formulario
  onClear() {
    this.form().reset();
    this.payLoad = '';
  }

  // Métodos para manejar campos repetibles
  getFormArray(key: string): FormArray {
    return this.form().get(key) as FormArray;
  }

  addField(key: string): void {
    const field = this.fields()?.find((f) => f.key === key);
    if (field) {
      this._fb.addItem(this.getFormArray(key), field.value || '', field.rules || []);
    }
  }

  removeField(key: string, index: number): void {
    this._fb.removeItem(this.getFormArray(key), index);
  }

  isRepeatableField(field: FieldBase<string>): boolean {
    return field.state.repeatible.repeat === true;
  }

  private normalizeSelectableFields(): void {
    const fields = this.fields() ?? [];

    fields.forEach((field) => this.syncSelectableFieldValue(field));
  }

  private normalizeInitialData(data: Record<string, any>): Record<string, any> {
    const fields = this.fields() ?? [];
    const normalizedData = { ...data };

    fields.forEach((field) => {
      if (![TypeFields.DATE, TypeFields.DATETIME].includes(field.type as TypeFields)) {
        return;
      }

      const value = normalizedData[field.key];
      if (typeof value !== 'string' || value.trim() === '') {
        return;
      }

      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) {
        normalizedData[field.key] = parsedDate;
      }
    });

    return normalizedData;
  }

  private serializeFormValue(value: unknown, fieldType?: TypeFields): unknown {
    if (value instanceof Date) {
      return fieldType === TypeFields.DATE
        ? this.formatDateOnly(value)
        : this.formatDateTimeWithOffset(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeFormValue(item, fieldType));
    }

    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        this.serializeFormValue(item, this.getFieldType(key)),
      ]);

      return Object.fromEntries(entries);
    }

    return value;
  }

  private getFieldType(key: string): TypeFields | undefined {
    const field = (this.fields() ?? []).find((item) => item.key === key);
    return field?.type as TypeFields | undefined;
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateTimeWithOffset(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffsetMinutes = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, '0');
    const offsetRemainder = String(absoluteOffsetMinutes % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetRemainder}`;
  }

  private syncSelectableFieldValue(field: FieldBase<string>): void {
    if (!this.isSelectableField(field)) {
      return;
    }

    const control = this.form().get(field.key);
    if (!control) {
      return;
    }

    const options = this.getSelectableOptions(field);
    if (options.length === 0) {
      console.debug('[DynamicForm] selectable field has no options yet', field.key, control.value);
      return;
    }

    const currentValue = control.value;
    const normalizedValue = this.normalizeSelectableValue(currentValue, options);

    console.debug('[DynamicForm] syncing selectable field', {
      fieldKey: field.key,
      currentValue,
      normalizedValue,
      options,
    });

    if (!this.areSelectableValuesEqual(currentValue, normalizedValue)) {
      control.setValue(normalizedValue, { emitEvent: false });
    }
  }

  private getSelectableOptions(field: FieldBase<string>): CatalogOption[] {
    if (field.optionsSource) {
      return this.catalogOptionsService.getOptions(field.key);
    }

    return field.options || [];
  }

  private isSelectableField(field: FieldBase<string>): boolean {
    return [TypeFields.SELECT, TypeFields.MULTISELECT, TypeFields.RADIO].includes(
      field.type as TypeFields,
    );
  }

  private normalizeSelectableValue(value: unknown, options: CatalogOption[]): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeSelectableValue(item, options));
    }

    const matchedOption = options.find((option) => String(option.key) === String(value));
    return matchedOption ? matchedOption.key : value;
  }

  private areSelectableValuesEqual(left: unknown, right: unknown): boolean {
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false;
      }

      return left.every((item, index) => String(item) === String(right[index]));
    }

    return String(left) === String(right);
  }
}
