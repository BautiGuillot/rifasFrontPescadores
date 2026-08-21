import { HttpResponse } from '@angular/common/http';

export function abrirODescargarComprobante(response: HttpResponse<Blob>): boolean {
  const blob = response.body;
  if (!blob) {
    return false;
  }

  const nombre = nombreArchivoDesdeContentDisposition(
    response.headers.get('Content-Disposition'),
    blob.type,
  );
  const url = URL.createObjectURL(blob);

  if (blob.type.startsWith('image/')) {
    window.open(url, '_blank', 'noopener');
  } else {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export function nombreArchivoDesdeContentDisposition(
  contentDisposition: string | null,
  contentType: string,
): string {
  const utf8 = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      // Si el encabezado estuviera mal codificado, se intenta el nombre simple.
    }
  }

  const simple = contentDisposition?.match(/filename="([^"]+)"/i)?.[1];
  if (simple) {
    return simple;
  }
  return contentType === 'application/pdf' ? 'comprobante.pdf' : 'comprobante';
}
