import { Component, inject, model, output } from '@angular/core';
import { SelectedDisplay } from '../../../shared/features/selected-display/selected-display';
import { DynamicTableService } from '../../../shared/features/dynamic-table/services/dynamic-table.service';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-overlay',
  imports: [SelectedDisplay, DrawerModule, ButtonModule],
  templateUrl: './overlay.html',
  styleUrl: './overlay.css',
})
export class Overlay {
  visible = model(false);
  tableService = inject(DynamicTableService);
  delete = output<string>();
  pageChange = output<{ first: number; rows: number }>();

  get tableProps() {
    return this.tableService.tableProps;
  }

  deletedFn($event: string) {
    this.delete.emit($event);
  }

  onPageChange($event: { first: number; rows: number }) {
    this.pageChange.emit($event);
  }
}
