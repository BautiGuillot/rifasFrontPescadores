import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Compra, RifaDetalle } from '../../core/api.models';
import { RifasApiService } from '../../core/rifas-api.service';

@Component({
  selector: 'app-admin-rifa-detalle',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './admin-rifa-detalle.component.html',
})
export class AdminRifaDetalleComponent {
  private readonly api = inject(RifasApiService);
  private readonly route = inject(ActivatedRoute);

  readonly rifa = signal<RifaDetalle | null>(null);
  readonly compras = signal<Compra[]>([]);
  readonly mensaje = signal('');
  readonly error = signal('');

  constructor() {
    this.cargarDetalle();
  }

  linkPublicoRifa(rifa: RifaDetalle): string {
    return `${window.location.origin}/r/${rifa.slug}`;
  }

  copiarLinkRifa(rifa: RifaDetalle): void {
    navigator.clipboard.writeText(this.linkPublicoRifa(rifa)).then(
      () => this.mensaje.set('Link copiado.'),
      () => this.error.set('No se pudo copiar el link.'),
    );
  }

  whatsappUrl(numero: string): string {
    return `https://wa.me/${numero.replace(/\D/g, '')}`;
  }

  aprobarCompra(id: number): void {
    if (!confirm('¿Aprobar esta compra y marcar los números como ocupados?')) {
      return;
    }
    this.api.aprobarCompra(id).subscribe(() => this.cargarDetalle());
  }

  cancelarCompra(id: number): void {
    if (!confirm('¿Cancelar esta compra y liberar sus números?')) {
      return;
    }
    this.api.cancelarCompra(id).subscribe(() => this.cargarDetalle());
  }

  abrirComprobante(compra: Compra): void {
    this.api.descargarComprobante(compra.id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.error.set('No se pudo abrir el comprobante.');
          return;
        }
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.error.set('No se pudo abrir el comprobante.'),
    });
  }

  private cargarDetalle(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Rifa inválida.');
      return;
    }

    this.api.detalleRifa(id).subscribe({
      next: (rifa) => {
        this.rifa.set(rifa);
        this.cargarCompras(rifa.id);
      },
      error: () => this.error.set('No se pudo cargar la rifa.'),
    });
  }

  private cargarCompras(rifaId: number): void {
    this.api.listarCompras().subscribe({
      next: (compras) => this.compras.set(compras.filter((compra) => compra.rifaId === rifaId)),
      error: () => this.error.set('No se pudieron cargar las compras de la rifa.'),
    });
  }
}
