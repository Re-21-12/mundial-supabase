import { Database } from './../../../types/database.types';
import { Component, inject, input, model, output, signal, WritableSignal } from '@angular/core';
import { TableTemplateModel } from '../../../shared/features/dynamic-table/interfaces/table-interface';
import { PostgrestError } from '@supabase/supabase-js';
import { SelectedDisplay } from '../../../shared/features/selected-display/selected-display';
import { formFields } from '../../../shared/features/dynamic-form/utils/forms';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
const COMPONENTS = [SelectedDisplay, DrawerModule, ButtonModule];
@Component({
  selector: 'app-overlay',
  imports: [COMPONENTS],
  templateUrl: './overlay.html',
  styleUrl: './overlay.css',
})
export class Overlay {
  visible = model(false);

  tableProps = input.required<TableTemplateModel>();
  delete = output<string>();
  deletedFn($event: string){
    this.delete.emit($event);
  }
}
