import { Validators } from '@angular/forms';
import { TypeFields } from '../enums/type-fields';
import { StateProps } from './state-props';

export interface FieldOptionSource {
  table: 'CATALOG' | string;
  filterField?: string;
  filterValue?: string | number;
  valueField?: string;
  labelField?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface FieldStorageConfig {
  bucket: string;
  folder?: string;
}

export type FormFields = Record<string, { fields: FieldBase<any>[] }>;
export class FieldBase<T> {
  value: T | undefined;
  icon: string;
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  state: StateProps;
  order: number;
  controlType: TypeFields | string;
  type: string;
  options: { key: string | number; value: string }[];
  optionsSource?: FieldOptionSource;
  storage?: FieldStorageConfig;
  rules: Validators[];
  constructor(
    options: {
      value?: T;
      icon?: string;
      key?: string;
      label?: string;
      state?: StateProps;
      order?: number;
      placeholder?: string;
      hint?: string;
      validators?: Validators[];
      controlType?: TypeFields | string;
      type?: string;
      options?: { key: string | number; value: string }[];
      optionsSource?: FieldOptionSource;
      storage?: FieldStorageConfig;
    } = {},
  ) {
    this.value = options.value;
    this.icon = options.icon || '';
    this.key = options.key || '';
    this.label = options.label || '';
    this.state = options.state || {
      required: false,
      disabled: false,
      hidden: false,
      readonly: false,
      repeatible: { repeat: false, minItems: 0, maxItems: 1 },
    };
    this.rules = options.validators || [];
    this.placeholder = options.placeholder || '';
    this.hint = options.hint || '';
    this.order = options.order === undefined ? 1 : options.order;
    this.controlType = options.controlType || '';
    this.type = options.type || '';
    this.options = options.options || [];
    this.optionsSource = options.optionsSource;
    this.storage = options.storage;
  }
}
