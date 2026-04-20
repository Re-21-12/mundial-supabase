import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

const COMPONENTS = [ButtonModule, DialogModule];
@Component({
  selector: 'app-dynamic-modal',
  imports: COMPONENTS,
  templateUrl: './dynamic-modal.html',
  styleUrl: './dynamic-modal.css',
  providers: [DialogService],
})
export class DynamicModal {
  ref: DynamicDialogRef | null = null;
  public dialogService = inject(DialogService);
  show() {
    // this.ref = this.dialogService.open(ProductListDemo, { header: 'Select a Product' });
  }
}
