import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-confirm-delete-modal',
  templateUrl: './confirm-delete-modal.component.html',
  styleUrl: './confirm-delete-modal.component.css',
  imports: [ButtonModule],
})
export class ConfirmDeleteModalComponent {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);

  close(confirmed: boolean) {
    this.ref.close(confirmed);
  }
}
