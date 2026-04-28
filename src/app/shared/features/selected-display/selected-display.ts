import { Component, inject, OnInit, WritableSignal, signal, output } from '@angular/core';
import { DynamicTable } from '../dynamic-table/dynamic-table';
import { DynamicCards } from '../dynamic-cards/dynamic-cards';
import { DeviceInfoService } from '../../../core/services/device-info-service';
import { DynamicTableService } from '../dynamic-table/services/dynamic-table.service';

@Component({
  selector: 'app-selected-display',
  imports: [DynamicTable, DynamicCards],
  templateUrl: './selected-display.html',
  styleUrl: './selected-display.css',
})
export class SelectedDisplay implements OnInit {
  isDesktop: WritableSignal<boolean> = signal(false);
  tableService = inject(DynamicTableService);
  selectedDeviceService = inject(DeviceInfoService);

  delete = output<string>();
  pageChange = output<{ first: number; rows: number }>();

  ngOnInit(): void {
    this.isDesktopFn();
  }

  isDesktopFn() {
    this.selectedDeviceService.isDesktop$.subscribe((isDesktop) => {
      this.isDesktop.set(isDesktop);
    });
  }

  deletedFn($event: string) {
    this.delete.emit($event);
  }

  onPageChange($event: { first: number; rows: number }) {
    this.pageChange.emit($event);
  }
}
