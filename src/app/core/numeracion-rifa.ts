export interface VistaPreviaNumeracion {
  cantidadFilas: number;
  filas: string[];
}

export function vistaPreviaNumeracion(
  cantidadNumeros: number,
  numerosPorFila: number,
  numeroInicial: number,
): VistaPreviaNumeracion | null {
  if (
    !Number.isInteger(cantidadNumeros) ||
    !Number.isInteger(numerosPorFila) ||
    cantidadNumeros < 1 ||
    numerosPorFila < 1 ||
    numerosPorFila > cantidadNumeros ||
    cantidadNumeros % numerosPorFila !== 0 ||
    (numeroInicial !== 0 && numeroInicial !== 1)
  ) {
    return null;
  }

  const cantidadFilas = cantidadNumeros / numerosPorFila;
  const ultimoNumero = numeroInicial + cantidadNumeros - 1;
  const ancho = Math.max(2, String(ultimoNumero).length);
  const fila = (indice: number) =>
    Array.from({ length: numerosPorFila }, (_, columna) =>
      String(numeroInicial + indice + columna * cantidadFilas).padStart(ancho, '0'),
    ).join('_');
  const indices = cantidadFilas <= 4
    ? Array.from({ length: cantidadFilas }, (_, indice) => indice)
    : [0, 1, 2, cantidadFilas - 1];
  const filas = indices.map(fila);
  if (cantidadFilas > 4) {
    filas.splice(3, 0, '…');
  }
  return { cantidadFilas, filas };
}
