import { describe, expect, it } from 'vitest';
import { nombreArchivoDesdeContentDisposition } from './archivo-descarga';

describe('nombreArchivoDesdeContentDisposition', () => {
  it('conserva la extension pdf indicada por el backend', () => {
    expect(
      nombreArchivoDesdeContentDisposition(
        'attachment; filename="comprobante-whatsapp.pdf"',
        'application/octet-stream',
      ),
    ).toBe('comprobante-whatsapp.pdf');
  });

  it('decodifica nombres utf8', () => {
    expect(
      nombreArchivoDesdeContentDisposition(
        "attachment; filename*=UTF-8''comprobante%20n%C2%B01.pdf",
        'application/octet-stream',
      ),
    ).toBe('comprobante n°1.pdf');
  });
});
