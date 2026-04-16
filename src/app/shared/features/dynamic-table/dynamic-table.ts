import { Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TableTemplateModel } from './interfaces/table-interface';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
const PRIME_NG = [TableModule, PaginatorModule, SkeletonModule, ButtonModule];
@Component({
  selector: 'app-dynamic-table',
  imports: PRIME_NG,
  templateUrl: './dynamic-table.html',
  styleUrl: './dynamic-table.css',
})
export class DynamicTable {
  tableProps = input.required<TableTemplateModel>();
}
