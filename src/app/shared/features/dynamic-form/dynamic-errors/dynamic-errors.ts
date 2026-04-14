import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-dynamic-errors',
  imports: [CommonModule, MessageModule],
  templateUrl: './dynamic-errors.html',
  styleUrl: './dynamic-errors.css',
})
export class DynamicErrors {
  // Campo del formulario (Field de Angular Signals)
  field = input<FormControl | null>(null);

  shouldShow(): boolean {
    const control = this.field();
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrors(): Array<{ key: string; value: any; message: string }> {
    const control = this.field();
    if (!control || !control.errors) {
      return [];
    }

    return Object.entries(control.errors).map(([key, value]) => ({
      key,
      value,
      message: this.getErrorMessage(key, value),
    }));
  }

  getErrorMessage(errorKey: string | number | symbol, errorValue: any): string {
    const errorMessages: { [key: string]: string } = {
      required: 'Este campo es obligatorio',
      email: 'Ingrese un email válido',
      minlength: `Debe tener al menos ${errorValue?.requiredLength} caracteres`,
      maxlength: `No debe superar ${errorValue?.requiredLength} caracteres`,
      min: `El valor mínimo es ${errorValue?.min}`,
      max: `El valor máximo es ${errorValue?.max}`,
      pattern: 'El formato no es válido',
    };

    return errorMessages[String(errorKey)] || 'Error de validación';
  }
}
