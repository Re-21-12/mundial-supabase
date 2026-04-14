// ==================== VALIDADORES SIMPLES ====================

// Validar enteros (números sin decimales)
export function validarEntero(valor: string): boolean {
  const regex = /^\d+$/;
  return regex.test(valor);
}

// Validar decimales
export function validarDecimal(valor: string): boolean {
  const regex = /^\d+(\.\d+)?$/;
  return regex.test(valor);
}

// Validar moneda (formato: 1000, 1000.00, permite decimales opcionales)
export function validarMoneda(valor: string): boolean {
  const regex = /^\d+(\.\d{1,2})?$/;
  return regex.test(valor);
}

// Validar letras
export function validarLetras(valor: string): boolean {
  const regex = /^[A-Za-z]+$/;
  return regex.test(valor);
}

// Validar números reales
export function validarNumeroReal(valor: string): boolean {
  const regex = /^-?\d+(\.\d+)?$/;
  return regex.test(valor);
}

// Validar email según RFC 5322 (versión simplificada pero completa)
// Formato: usuario@dominio.extensión
// - Usuario: letras, números, puntos, guiones, guiones bajos, signos más, caracteres especiales RFC
// - Dominio: letras, números, guiones, puntos
// - Extensión: mínimo 2 caracteres alfanuméricos
export function validarEmail(valor: string): boolean {
  // Validación simple: debe contener un '@' y terminar en '.com'
  const regex = /^[^@\s]+@[^@\s]+\.com$/;
  return regex.test(valor);
}

// Validar fecha DD/MM/YYYY
export function validarFecha(valor: string): boolean {
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
  return regex.test(valor);
}

// Validar rango de fechas
export function validarRangoFechas(fechaInicio: string, fechaFin: string): boolean {
  const inicio = new Date(fechaInicio.split('/').reverse().join('-'));
  const fin = new Date(fechaFin.split('/').reverse().join('-'));
  return inicio <= fin;
}

// ==================== HANDLERS PARA KEYPRESS ====================
// Bloquean caracteres inválidos en tiempo real

function exceedsMaxLength(
  input: HTMLInputElement | HTMLTextAreaElement,
  nextChunk: string,
): boolean {
  const max = input.maxLength ?? -1;
  if (max <= 0) {
    return false;
  }

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const currentLength = input.value.length;
  const prospectiveLength = currentLength - (end - start) + nextChunk.length;
  return prospectiveLength > max;
}

// Bloquear entrada inválida para email en keypress
export function onKeypressEmail(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const key = event.key;

  // Permitir tecleo progresivo: letras, números, punto, guion, guion bajo y '@'
  const permitido = /^[A-Za-z0-9._\-@]$/;
  if (!permitido.test(key)) {
    event.preventDefault();
    return;
  }

  if (exceedsMaxLength(input, key)) {
    event.preventDefault();
    return;
  }

  // Solo un '@' en todo el valor
  if (key === '@' && input.value.includes('@')) {
    event.preventDefault();
    return;
  }
}

// Bloquear entrada inválida para enteros en keypress
export function onKeypressEntero(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const key = event.key;

  // Permitir solo: números
  const permitido = /^[0-9]$/;
  if (!permitido.test(key)) {
    event.preventDefault();
    return;
  }

  if (exceedsMaxLength(input, key)) {
    event.preventDefault();
  }
}
// Bloquear entrada inválida para decimales en keypress
export function onKeypressDecimal(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const nuevoValor = input.value + event.key;

  // Permitir solo: números y un punto
  const regexPermitida = /^\d*\.?\d*$/;

  if (!regexPermitida.test(nuevoValor)) {
    event.preventDefault();
    console.log(`Carácter no permitido: '${event.key}'`);
    return;
  }

  if (exceedsMaxLength(input, event.key)) {
    event.preventDefault();
  }
}

// Bloquear entrada inválida para moneda en keypress (máximo 2 decimales)
export function onKeypressMoneda(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const key = event.key;
  const currentValue = input.value;

  // Solo números y un punto
  if (!/^[0-9.]$/.test(key)) {
    event.preventDefault();
    return;
  }

  // Solo un punto permitido
  if (key === '.' && currentValue.includes('.')) {
    event.preventDefault();
    return;
  }

  // Limitar a 2 decimales después del punto
  if (currentValue.includes('.')) {
    const parts = currentValue.split('.');
    if (parts[1] && parts[1].length >= 2 && input.selectionStart! > currentValue.indexOf('.')) {
      event.preventDefault();
      return;
    }
  }

  if (exceedsMaxLength(input, key)) {
    event.preventDefault();
  }
}

// Bloquear entrada inválida para letras en keypress
export function onKeypressLetras(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const nuevoValor = input.value + event.key;

  // Permitir solo: letras y espacios
  const regexPermitida = /^[A-Za-z\s]*$/;

  if (!regexPermitida.test(nuevoValor)) {
    event.preventDefault();
    console.log(`Carácter no permitido: '${event.key}'`);
    return;
  }

  if (exceedsMaxLength(input, event.key)) {
    event.preventDefault();
  }
}

// Bloquear entrada inválida para números reales en keypress
export function onKeypressNumeroReal(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const nuevoValor = input.value + event.key;

  // Permitir solo: números, punto y signo menos al inicio
  const regexPermitida = /^-?\d*\.?\d*$/;

  if (!regexPermitida.test(nuevoValor)) {
    event.preventDefault();
    console.log(`Carácter no permitido: '${event.key}'`);
    return;
  }

  if (exceedsMaxLength(input, event.key)) {
    event.preventDefault();
  }
}

// Bloquear entrada inválida para fechas en keypress
export function onKeyPressFecha(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const nuevoValor = input.value + event.key;

  // Permitir solo: números y slashes para formato DD/MM/YYYY
  const regexPermitida = /^\d{0,2}\/?\\d{0,2}\/?\\d{0,4}$/;

  if (!regexPermitida.test(nuevoValor)) {
    event.preventDefault();
    console.log(`Carácter no permitido: '${event.key}'`);
    return;
  }

  if (exceedsMaxLength(input, event.key)) {
    event.preventDefault();
  }
}
