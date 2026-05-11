import { Validators } from '@angular/forms';
import { TypeFields } from '../../../shared/features/dynamic-form/enums/type-fields';
import { FormFields } from '../../../shared/features/dynamic-form/interfaces/field-props';

export const formFields: FormFields = {
  teamForm: {
    fields: [
      {
        icon: 'pi pi-users',
        key: 'name',
        type: TypeFields.TEXT,
        label: 'Nombre del Equipo',
        placeholder: 'Ingresa el nombre del equipo',
        state: {
          required: true,
          disabled: false,
          hidden: false,
          readonly: false,
          repeatible: { repeat: false, minItems: 1, maxItems: 1 },
        },
        hint: 'Nombre oficial del equipo',
        value: '',
        rules: [Validators.required, Validators.minLength(3)],
        options: [],
        controlType: TypeFields.TEXT,
        order: 1,
      },
      {
        icon: 'pi pi-globe',
        key: 'catalog_id',
        type: TypeFields.SELECT,
        label: 'ID de Catálogo',
        placeholder: 'Ingresa el ID de catálogo',
        state: {
          required: true,
          disabled: false,
          hidden: false,
          readonly: false,
          repeatible: { repeat: false, minItems: 1, maxItems: 1 },
        },
        hint: 'ID del catálogo de países',
        value: 0,
        rules: [Validators.required],
        options: [],
        optionsSource: {
          table: 'CATALOG',
          filterField: 'table_id',
          filterValue: '1',
          valueField: 'catalog_id',
          labelField: 'description',
          orderBy: 'description',
          order: 'asc',
          includeDeleted: false,
        },
        controlType: TypeFields.SELECT,
        order: 2,
      },
    ],
  },
};
