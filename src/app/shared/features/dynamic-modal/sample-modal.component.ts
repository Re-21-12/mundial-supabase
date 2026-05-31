import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-sample-modal',
  templateUrl: './sample-modal.component.html',
  styleUrl: './sample-modal.component.css',
  imports: [ButtonModule],
})
export class SampleModalComponent {
  ref = inject(DynamicDialogRef);
  close(value?: boolean) {
    this.ref.close(value);
  }
}
