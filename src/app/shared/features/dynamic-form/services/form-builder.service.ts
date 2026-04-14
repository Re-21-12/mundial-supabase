import { FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { Injectable } from '@angular/core';
import { FieldBase } from '../interfaces/field-props';

@Injectable({
  providedIn: 'root',
})
export class FormBuilderService {
  toFormGroup(fields: FieldBase<string>[]) {
    const group: any = {};
    fields.forEach((field) => {
      let validators: any = [];

      if (field.rules !== undefined) {
        field.rules.forEach((rule: Validators) => {
          validators.push(rule);
        });
      }

      // Si el campo es repetible, crear un FormArray
      if (field.state.repeatible.repeat) {
        group[field.key] = new FormArray(this.createRepeatableItems(field.value || '', validators));
      } else {
        group[field.key] = new FormControl(field.value || '', validators);
      }
    });
    return new FormGroup(group);
  }

  // Crear items iniciales para FormArray
  private createRepeatableItems(initialValue: string, validators: any[]): FormControl[] {
    return [new FormControl(initialValue, validators)];
  }

  // Agregar nuevo item al FormArray
  addItem(formArray: FormArray, value: string = '', validators: any[] = []): void {
    formArray.push(new FormControl(value, validators));
  }

  // Remover item del FormArray
  removeItem(formArray: FormArray, index: number): void {
    formArray.removeAt(index);
  }
}
