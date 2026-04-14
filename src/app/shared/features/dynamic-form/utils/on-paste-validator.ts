import {
  validarEmail,
  validarDecimal,
  validarFecha,
  validarLetras,
  validarNumeroReal,
  validarEntero,
  validarMoneda,
} from './on-input-validator';

// Validar pegado de email
export function validarEmailPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';

  if (exceedsMaxLengthOnPaste(input, data) || !validarEmail(data)) {
    event.preventDefault();
  }
}

// Validar pegado de decimal
export function validarDecimalPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';
  if (exceedsMaxLengthOnPaste(input, data) || !validarDecimal(data)) {
    event.preventDefault();
  }
}

// Validar pegado de fecha
export function validarFechaPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';
  if (exceedsMaxLengthOnPaste(input, data) || !validarFecha(data)) {
    event.preventDefault();
  }
}

// Validar pegado de letras
export function validarLetrasPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';
  if (exceedsMaxLengthOnPaste(input, data) || !validarLetras(data)) {
    event.preventDefault();
  }
}

// Validar pegado de número real
export function validarNumeroRealPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';
  if (exceedsMaxLengthOnPaste(input, data) || !validarNumeroReal(data)) {
    event.preventDefault();
  }
}

// Validar pegado de entero
export function validarEnteroPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';
  if (exceedsMaxLengthOnPaste(input, data) || !validarEntero(data)) {
    event.preventDefault();
  }
}

// Validar pegado de moneda
export function validarMonedaPaste(event: ClipboardEvent): void {
  const input = event.target as HTMLInputElement;
  const data = event.clipboardData?.getData('text') || '';
  if (exceedsMaxLengthOnPaste(input, data) || !validarMoneda(data)) {
    event.preventDefault();
  }
}

// -------------------- helpers --------------------
function exceedsMaxLengthOnPaste(
  input: HTMLInputElement | HTMLTextAreaElement,
  pasted: string,
): boolean {
  const max = input.maxLength ?? -1;
  if (max <= 0) {
    return false;
  }

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const currentLength = input.value.length;
  const prospectiveLength = currentLength - (end - start) + pasted.length;
  return prospectiveLength > max;
}
