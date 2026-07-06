import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Compra, EstadoCompra, RifaDetalle } from '../../core/api.models';
import { RifasApiService } from '../../core/rifas-api.service';

@Component({
  selector: 'app-admin-rifa-detalle',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './admin-rifa-detalle.component.html',
})
export class AdminRifaDetalleComponent {
  private readonly api = inject(RifasApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly rifa = signal<RifaDetalle | null>(null);
  readonly compras = signal<Compra[]>([]);
  readonly compraFiltro = signal<EstadoCompra | ''>('PENDIENTE_PAGO');
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly comprasFiltradas = computed(() => {
    const filtro = this.compraFiltro();
    return filtro ? this.compras().filter((compra) => compra.estado === filtro) : this.compras();
  });
  readonly comprasPendientes = computed(() =>
    this.compras().filter((compra) => compra.estado === 'PENDIENTE_PAGO').length,
  );
  readonly comprasAprobadas = computed(() =>
    this.compras().filter((compra) => compra.estado === 'APROBADA').length,
  );

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

  colorPrincipal(rifa: RifaDetalle): string {
    return rifa.clienteColorPrincipal || '#082d50';
  }

  mediaUrl(url?: string | null): string {
    return this.api.mediaUrl(url);
  }

  cambiarFiltroCompras(estado: EstadoCompra | ''): void {
    this.compraFiltro.set(estado);
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

  finalizarConGanadores(rifa: RifaDetalle): void {
    const ganadores = this.pedirGanadores(rifa);
    if (!ganadores) {
      return;
    }
    if (!confirm('¿Finalizar esta rifa y publicar los ganadores? Ya no se podrán realizar compras.')) {
      return;
    }
    this.api.finalizarRifaConGanadores(rifa.id, ganadores).subscribe({
      next: () => {
        this.mensaje.set('Rifa finalizada con ganadores cargados.');
        this.error.set('');
        this.cargarDetalle();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo finalizar la rifa.'),
    });
  }

  eliminar(rifa: RifaDetalle): void {
    if (rifa.estado !== 'CANCELADA') {
      this.error.set('Solo se pueden eliminar rifas canceladas.');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente la rifa "${rifa.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.api.eliminarRifa(rifa.id).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (error) => this.error.set(error.error?.message || 'No se pudo eliminar la rifa.'),
    });
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

  private pedirGanadores(rifa: RifaDetalle): { posicion: number; numero: number }[] | null {
    const ganadores: { posicion: number; numero: number }[] = [];
    for (let posicion = 1; posicion <= rifa.cantidadGanadores; posicion++) {
      const valor = window.prompt(`Número ganador para el puesto ${posicion}`);
      if (valor === null) {
        return null;
      }
      const numero = Number(valor.trim());
      if (!Number.isInteger(numero) || numero < 0) {
        this.error.set('El número ganador debe ser un número válido.');
        return null;
      }
      ganadores.push({ posicion, numero });
    }
    return ganadores;
  }
}
