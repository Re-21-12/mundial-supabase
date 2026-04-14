import { Component, input, computed, effect, signal, inject, output } from '@angular/core';
import { Button } from 'primeng/button';
import { formFields } from './utils/forms';
import { FieldBase } from './interfaces/field-props';
import { DynamicField } from './dynamic-field/dynamic-field';
import { FormGroup, FormArray } from '@angular/forms';
import { FormBuilderService } from './services/form-builder.service';
import { TooltipModule } from 'primeng/tooltip';
@Component({
  selector: 'app-dynamic-form',
  imports: [DynamicField, Button, TooltipModule],
  templateUrl: './dynamic-form.html',
  styleUrls: ['./dynamic-form.css'],
})
export class DynamicForm {
  data = output<string>();

  private readonly fb = inject(FormBuilderService);

  readonly fields = input<FieldBase<string>[] | null>([]);
  readonly form = computed<FormGroup>(() =>
    this.fb.toFormGroup(this.fields() as FieldBase<string>[]),
  );

  payLoad = '';

  // Computed para verificar si el formulario tiene datos
  hasData = computed(() => {
    const form = this.form();
    // Verificar si hay al menos un campo con valor
    return form.valid;
  });

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
      this.fb.addItem(this.getFormArray(key), field.value || '', field.rules || []);
    }
  }

  removeField(key: string, index: number): void {
    this.fb.removeItem(this.getFormArray(key), index);
  }

  isRepeatableField(field: FieldBase<string>): boolean {
    return field.state.repeatible.repeat === true;
  }
}
