import { Component, input } from '@angular/core';
import { TableTemplateModel } from '../dynamic-table/interfaces/table-interface';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';

const PRIME_NG = [CardModule, CommonModule];
@Component({
  selector: 'app-dynamic-cards',
  imports: [PRIME_NG],
  templateUrl: './dynamic-cards.html',
  styleUrl: './dynamic-cards.css',
})
export class DynamicCards {
  tableProps = input.required<TableTemplateModel>();
}
