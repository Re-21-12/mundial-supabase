import { Component, input, computed } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-dynamic-hint',
  imports: [],
  templateUrl: './dynamic-hint.html',
  styleUrl: './dynamic-hint.css',
})
export class DynamicHint {
  hint = input<string | null>(null);
  currentLength = input<number | null>(null);
  maxLength = input<number | null>(null);
  field = input<FormControl | null>(null);

  // Computed para verificar si hay errores visibles
  hasErrors = computed(() => {
    const control = this.field();
    return !!control && control.invalid && (control.dirty || control.touched);
  });
}
