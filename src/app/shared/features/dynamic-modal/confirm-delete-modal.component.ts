import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-confirm-delete-modal',
  template: `
    <div class="flex flex-col gap-6 p-2">
      <div class="flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-red-400 text-3xl"></i>
        <div>
          <p class="text-base font-semibold text-white">¿Estás seguro de eliminar este registro?</p>
          @if (config.data?.label) {
            <p class="text-sm text-surface-400 mt-1">{{ config.data.label }}</p>
          }
          <p class="text-sm text-surface-400 mt-1">Esta acción marcará el registro como eliminado y no podrá deshacerse.</p>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <p-button
          label="Cancelar"
          icon="pi pi-times"
          severity="secondary"
          [outlined]="true"
          (onClick)="close(false)"
        />
        <p-button
          label="Eliminar"
          icon="pi pi-trash"
          severity="danger"
          (onClick)="close(true)"
        />
      </div>
    </div>
  `,
  imports: [ButtonModule],
})
export class ConfirmDeleteModalComponent {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);

  close(confirmed: boolean) {
    this.ref.close(confirmed);
  }
}
