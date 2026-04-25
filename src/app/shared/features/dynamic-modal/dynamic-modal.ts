import { Component, DestroyRef, inject, OnDestroy, input, output, Type } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SampleModalComponent } from './sample-modal.component';

const COMPONENTS = [ButtonModule];
@Component({
  selector: 'app-dynamic-modal',
  imports: COMPONENTS,
  templateUrl: './dynamic-modal.html',
  styleUrl: './dynamic-modal.css',
  providers: [DialogService],
})
export class DynamicModal implements OnDestroy {
  componentToRender = input<Type<any>>();
  onAction = output<boolean>();

  ref: DynamicDialogRef | null = null;
  private destroyRef = inject(DestroyRef);
  public dialogService = inject(DialogService);

  show(overrideComponent?: Type<any>) {
    const component = overrideComponent || this.componentToRender() || SampleModalComponent;

    this.ref = this.dialogService.open(component, {
      header: 'Dynamic Modal Title',
      width: '50vw',
      modal: true,
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
    });

    this.ref?.onClose
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {
        if (data !== undefined) {
          this.onAction.emit(data);
          console.log('Evento emitido:', data);
        } else {
          console.log('Dialogo cerrado sin emitir evento');
        }
      });
  }

  ngOnDestroy() {
    this.ref?.close();
  }
}
