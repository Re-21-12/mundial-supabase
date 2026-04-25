# Forms

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
# dynamic-repetible-signal-forms

Como cargan los datos a el formulario dinamico si no conoce la estructura
```
# Componente page (papa)
      if (id && Array.isArray(response) && response.length > 0) {
        this.editData.set(response[0] as Record<string, any>);
      }
# el dinamico (hijo)
  readonly initialData = input<Record<string, any> | null>(null);

  readonly form = computed<FormGroup>(() =>
    this._fb.toFormGroup(this.fields() as FieldBase<string>[]),
  );

  payLoad = '';

  constructor() {
    // Cuando llega initialData (modo edición), parchea el formulario
    effect(() => {
      const data = this.initialData();
      if (data) {
        // form() es computed, se re-evalúa si fields cambia
        this.form().patchValue(data);
      }
    });
  }
# la magia ? patchValue recorre en base a los keys  

// Simplificación del código fuente de Angular (AbstractControl)
patchValue(value: {[key: string]: any}) {
  Object.keys(value).forEach(key => {
    const control = this.controls[key]; // busca si existe ese control
    if (control) {
      control.patchValue(value[key]); // solo parchea si el control existe
    }
    // si la key NO existe en el form → la ignora silenciosamente
  });
}
```
