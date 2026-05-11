import { Component } from '@angular/core';
import { DynamicForm } from '../../../shared/features/dynamic-form/dynamic-form';
import { formFields } from './taste-form';

@Component({
  selector: 'app-taste',
  imports: [DynamicForm],
  templateUrl: './taste.html',
  styleUrl: './taste.css',
})
export class Taste {
  fields = formFields['proofForm'].fields;
}

