import { Component, input, signal, computed, resource } from '@angular/core';
import {
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormControlName,
  FormArray,
} from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { NgIf } from '@angular/common';
import { FieldBase } from '../interfaces/field-props';
import { Button } from 'primeng/button';
import {
  onKeypressEmail,
  onKeypressEntero,
  onKeypressDecimal,
  onKeypressMoneda,
  onKeypressLetras,
} from '../utils/on-input-validator';
import {
  validarEmailPaste,
  validarEnteroPaste,
  validarDecimalPaste,
  validarMonedaPaste,
  validarLetrasPaste,
} from '../utils/on-paste-validator';
import { DynamicState } from '../dynamic-state/dynamic-state';
import { DynamicErrors } from '../dynamic-errors/dynamic-errors';
import { DynamicHint } from '../dynamic-hint/dynamic-hint';
import { TooltipModule } from 'primeng/tooltip';
import { TypeFields } from '../enums/type-fields';

const PRIMENG = [
  AutoCompleteModule,
  InputTextModule,
  TextareaModule,
  CheckboxModule,
  RadioButtonModule,
  DatePickerModule,
  InputNumberModule,
  MultiSelectModule,
  ToggleSwitchModule,
  PasswordModule,
  FloatLabelModule,
  IftaLabelModule,
  InputGroupModule,
  InputGroupAddonModule,
  SelectModule,
  TooltipModule,
];
const ANGULAR_FORMS = [ReactiveFormsModule];

@Component({
  selector: 'app-dynamic-field',
  imports: [...PRIMENG, ...ANGULAR_FORMS, NgTemplateOutlet, DynamicErrors, DynamicHint],
  templateUrl: './dynamic-field.html',
  styleUrl: './dynamic-field.css',
})
export class DynamicField {
  // Validadores keypress
  onKeypressEmail = onKeypressEmail;
  onKeypressEntero = onKeypressEntero;
  onKeypressDecimal = onKeypressDecimal;
  onKeypressMoneda = onKeypressMoneda;
  onKeypressLetras = onKeypressLetras;

  // Validadores paste
  validarEmailPaste = validarEmailPaste;
  validarEnteroPaste = validarEnteroPaste;
  validarDecimalPaste = validarDecimalPaste;
  validarMonedaPaste = validarMonedaPaste;
  validarLetrasPaste = validarLetrasPaste;

  // Hacer TypeFields disponible en el template
  TypeFields = TypeFields;

  // Eliminado: Object expuesto ya no es necesario al usar keyvalue

  fieldControl = input.required<FieldBase<string>>();
  readonly form = input.required<FormGroup>();
  readonly isArrayItem = input<boolean>(false);
  readonly arrayIndex = input<number | null>(null);

  // Computed para acceder a las propiedades del campo
  fieldProps = computed(() => this.fieldControl());

  // Computed para verificar si el campo tiene ícono
  hasIcon = computed(() => {
    const icon = this.fieldProps().icon;
    return icon && icon.trim().length > 0;
  });

  // Computed para acceder al control del formulario como FormControl
  formControl = computed(() => {
    const formGroup = this.form();
    const key = this.fieldControl().key;

    if (this.isArrayItem() && this.arrayIndex() !== null) {
      // Es un item dentro de un FormArray
      const formArray = formGroup.get(key) as FormArray;
      const control = formArray?.at(this.arrayIndex()!);
      return control as FormControl;
    }

    // Es un control normal
    const control = formGroup.get(key);
    return control as FormControl;
  });

  get isValid() {
    return this.form().controls[this.fieldControl().key].valid;
  }

  get isDisabled() {
    return this.form().controls[this.fieldControl().key].disabled;
  }

  getProperty(property: string) {
    const control = this.form().get(this.fieldControl().key);
    return control ? control.get(property) : null;
  }

  private maxLengthCache: number | null | undefined;

  isTextualField(): boolean {
    const type = this.fieldProps().type;
    return [
      TypeFields.TEXT,
      TypeFields.EMAIL,
      TypeFields.INTEGER,
      TypeFields.DECIMAL,
      TypeFields.CURRENCY,
      TypeFields.TEXTAREA,
      TypeFields.PASSWORD,
    ].includes(type as TypeFields);
  }

  getMaxLength(): number | null {
    if (this.maxLengthCache !== undefined) {
      return this.maxLengthCache;
    }

    const control = this.formControl();
    const validator = control?.validator;
    if (!validator) {
      this.maxLengthCache = null;
      return this.maxLengthCache;
    }

    const probeControl = { value: 'x'.repeat(5000) } as FormControl;
    const result = validator(probeControl);
    const requiredLength = (result as any)?.['maxlength']?.requiredLength;

    this.maxLengthCache = typeof requiredLength === 'number' ? requiredLength : null;
    return this.maxLengthCache;
  }

  getCurrentLength(): number {
    const value = this.formControl().value;
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'string') {
      return value.length;
    }

    return String(value).length;
  }
}
