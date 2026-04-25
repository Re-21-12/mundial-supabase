import { Component, inject, input, OnInit, WritableSignal, signal, output } from '@angular/core';
import { DynamicTable } from '../dynamic-table/dynamic-table';
import { DynamicCards } from '../dynamic-cards/dynamic-cards';
import { TableTemplateModel } from '../dynamic-table/interfaces/table-interface';
import { DeviceInfoService } from '../../../core/services/device-info-service';
const COMPONENTS = [DynamicTable, DynamicCards];
@Component({
  selector: 'app-selected-display',
  imports: [COMPONENTS],
  templateUrl: './selected-display.html',
  styleUrl: './selected-display.css',
})
export class SelectedDisplay implements OnInit {
  isDesktop: WritableSignal<boolean> = signal(false);
  ngOnInit(): void {
    this.isDesktopFn();
  }
  isDesktopFn() {
    this.selectedDeviceService.isDesktop$.subscribe((isDesktop) => {
      this.isDesktop.set(isDesktop);
    });
  }
  selectedDeviceService = inject(DeviceInfoService);
  tableProps = input.required<TableTemplateModel>();
  delete = output<string>();
  deletedFn($event: any){
    console.log("Eliminado desde overlay");
    this.delete.emit($event);
  }
}
