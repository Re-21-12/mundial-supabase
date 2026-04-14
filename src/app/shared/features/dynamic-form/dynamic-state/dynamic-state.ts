import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-state',
  imports: [CommonModule],
  templateUrl: './dynamic-state.html',
  styleUrl: './dynamic-state.css',
})
export class DynamicState {
  // Recibe el formulario completo
  registrationForm = input<any>();

  // Recibe un campo específico del formulario para mostrar su estado
  field = input<any>(null);

  // Método helper para obtener errores
  getErrors() {
    return this.field()?.errors?.() || [];
  }

  // Método helper para verificar si tiene errores
  hasErrors() {
    return this.getErrors().length > 0;
  }

  // Método helper para verificar si es válido
  isValid() {
    return this.field()?.valid?.();
  }

  // Método helper para verificar si está tocado
  isTouched() {
    return this.field()?.touched?.();
  }

  // Método helper para verificar si está sucio
  isDirty() {
    return this.field()?.dirty?.();
  }

  // Método helper para verificar si está pendiente
  isPending() {
    return this.field()?.pending?.();
  }

  // Método helper para verificar si está deshabilitado
  isDisabled() {
    return this.field()?.disabled?.();
  }

  // Método helper para verificar si está oculto
  isHidden() {
    return this.field()?.hidden?.();
  }

  // Método helper para verificar si es solo lectura
  isReadonly() {
    return this.field()?.readonly?.();
  }
}
