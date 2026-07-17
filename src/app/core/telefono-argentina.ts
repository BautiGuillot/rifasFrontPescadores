export const PREFIJO_CELULAR_ARGENTINA = '+54 9';

export function normalizarCelularArgentino(valor: string): string {
  let digitos = valor.replace(/\D/g, '');

  if (digitos.startsWith('549')) {
    return digitos;
  }
  if (digitos.startsWith('54')) {
    digitos = digitos.slice(2);
    if (digitos.startsWith('9')) {
      digitos = digitos.slice(1);
    }
  }
  if (digitos.startsWith('0')) {
    digitos = digitos.slice(1);
  }

  return `549${digitos}`;
}

export function celularLocalArgentino(valor?: string | null): string {
  if (!valor) {
    return '';
  }

  const digitos = valor.replace(/\D/g, '');
  if (digitos.startsWith('549')) {
    return digitos.slice(3);
  }
  if (digitos.startsWith('54')) {
    return digitos.slice(digitos.startsWith('549') ? 3 : 2);
  }
  return digitos.startsWith('0') ? digitos.slice(1) : digitos;
}

export const VALIDACION_CELULAR_ARGENTINA = /^[+0-9\s-]{8,18}$/;
