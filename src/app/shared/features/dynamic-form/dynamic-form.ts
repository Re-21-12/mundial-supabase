import { Component, input, computed, effect, inject, output } from '@angular/core';
import { Button } from 'primeng/button';
import { formFields } from './utils/forms';
import { FieldBase } from './interfaces/field-props';
import { DynamicField } from './dynamic-field/dynamic-field';
import { FormGroup, FormArray } from '@angular/forms';
import { FormBuilderService } from './services/form-builder.service';
import { TooltipModule } from 'primeng/tooltip';
import { HttpLoadingService } from '../../../core/services/http-loading-service';
import { CatalogOptionsService } from './services/catalog-options.service';
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

  constructor() {
    // Modo edición: parchea los valores del form cuando llega initialData
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form().patchValue(data);
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
          void this.catalogOptionsService.loadOptions(field.key, field.optionsSource);
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
    this.payLoad = JSON.stringify(this.form().value);
    console.log('Datos:', this.payLoad);
    console.log('Datos JSON', this.form().value);
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
}
