import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-sample-modal',
  template: `
    <div class="flex flex-col gap-4">
      <p>This is a dynamically generated PrimeNG modal.</p>
      <div class="flex justify-end gap-2">
        <p-button label="Cancelar" icon="pi pi-times" severity="secondary" (onClick)="close(false)"></p-button>
        <p-button label="Aceptar" icon="pi pi-check" severity="success" (onClick)="close(true)"></p-button>
        <p-button label="Cerrar" icon="pi pi-sign-out" severity="danger" (onClick)="close()"></p-button>
      </div>
    </div>
  `,
  imports: [ButtonModule]
})
export class SampleModalComponent {
  ref = inject(DynamicDialogRef);
  close(value?: boolean) {
    this.ref.close(value);
  }
}
