import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AliasCobro, Compra, EstadoCompra, RifaDetalle } from '../../core/api.models';
import { RifasApiService } from '../../core/rifas-api.service';
import { vistaPreviaNumeracion } from '../../core/numeracion-rifa';
import { celularLocalArgentino, normalizarCelularArgentino, VALIDACION_CELULAR_ARGENTINA } from '../../core/telefono-argentina';
import { timer } from 'rxjs';

@Component({
  selector: 'app-admin-rifa-detalle',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-rifa-detalle.component.html',
})
export class AdminRifaDetalleComponent {
  private readonly api = inject(RifasApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly rifa = signal<RifaDetalle | null>(null);
  readonly compras = signal<Compra[]>([]);
  readonly compraFiltro = signal<EstadoCompra | ''>('PENDIENTE_PAGO');
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly edicionAbierta = signal(false);
  readonly guardandoEdicion = signal(false);
  readonly subiendoPremio = signal<number | null>(null);
  readonly ultimaActualizacionCompras = signal<Date | null>(null);
  readonly aliases = signal<AliasCobro[]>([]);
  readonly formEdicion = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,80}$/)]],
    descripcion: [''],
    aclaracionSorteo: [''],
    cantidadNumeros: [100, [Validators.required, Validators.min(1)]],
    numerosPorFila: [1, [Validators.required, Validators.min(1)]],
    numeroInicial: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
    cantidadGanadores: [1, [Validators.required, Validators.min(1)]],
    valorNumero: [1000, [Validators.required, Validators.min(1)]],
    aliasCobroId: [0, [Validators.required, Validators.min(1)]],
    aliasTransferencia: [''],
    whatsappComprobante: ['', [Validators.required, Validators.pattern(VALIDACION_CELULAR_ARGENTINA)]],
    premios: this.fb.array([this.crearPremio(1)]),
  });
  private readonly configuracionNumeros = toSignal(this.formEdicion.valueChanges, {
    initialValue: this.formEdicion.getRawValue(),
  });
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
  readonly compradoresPorFila = computed(() => {
    const compradores = new Map<string, { nombre: string; estado: EstadoCompra }>();
    this.compras()
      .filter((compra) => compra.estado !== 'CANCELADA')
      .sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion))
      .forEach((compra) => {
        compra.numeros.forEach((numeroCompra) => {
          const etiqueta = numeroCompra.split(' (', 1)[0].trim();
          compradores.set(etiqueta, { nombre: compra.nombre, estado: compra.estado });
        });
      });
    return compradores;
  });
  readonly aliasesActivos = computed(() => this.aliases().filter((alias) => alias.activo));
  readonly aliasSeleccionado = computed(() => {
    const aliasId = Number(this.formEdicion.controls.aliasCobroId.value);
    return this.aliases().find((alias) => alias.id === aliasId) || null;
  });
  readonly vistaPreviaNumeros = computed(() => {
    const { cantidadNumeros, numerosPorFila, numeroInicial } = this.configuracionNumeros();
    return vistaPreviaNumeracion(cantidadNumeros ?? 0, numerosPorFila ?? 0, numeroInicial ?? -1);
  });
  readonly mensajeWhatsApp = computed(() => {
    const rifa = this.rifa();
    if (!rifa) {
      return '';
    }
    return this.generarMensajeWhatsApp(rifa, this.compras());
  });

  constructor() {
    this.cargarDetalle();
    timer(15_000, 15_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rifa = this.rifa();
        if (rifa) {
          this.cargarCompras(rifa.id, false);
        }
      });
  }

  get premios(): FormArray {
    return this.formEdicion.controls.premios;
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

  copiarMensajeWhatsApp(): void {
    navigator.clipboard.writeText(this.mensajeWhatsApp()).then(
      () => {
        this.mensaje.set('Mensaje para WhatsApp copiado.');
        this.error.set('');
      },
      () => this.error.set('No se pudo copiar el mensaje.'),
    );
  }

  compartirMensajeWhatsApp(): void {
    const mensaje = this.mensajeWhatsApp();
    if (!mensaje) {
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
  }

  actualizarMensajeWhatsApp(): void {
    const rifa = this.rifa();
    if (rifa) {
      this.cargarCompras(rifa.id);
    }
  }

  whatsappUrl(numero: string): string {
    return `https://wa.me/${normalizarCelularArgentino(numero)}`;
  }

  colorPrincipal(rifa: RifaDetalle): string {
    return rifa.clienteColorPrincipal || '#082d50';
  }

  mediaUrl(url?: string | null): string {
    return this.api.mediaUrl(url);
  }

  aliasRifa(rifa: RifaDetalle): string {
    if (rifa.aliasCobroNombre && rifa.aliasTransferencia) {
      return `${rifa.aliasCobroNombre} · ${rifa.aliasTransferencia}`;
    }
    return rifa.aliasTransferencia || rifa.aliasCobroNombre || 'Sin alias';
  }

  cambiarFiltroCompras(estado: EstadoCompra | ''): void {
    this.compraFiltro.set(estado);
  }

  compradorDeFila(etiqueta: string): { nombre: string; estado: EstadoCompra } | undefined {
    return this.compradoresPorFila().get(etiqueta);
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

  publicar(rifa: RifaDetalle): void {
    if (!confirm('¿Publicar esta rifa? Quedará visible para los clientes.')) {
      return;
    }
    this.api.publicarRifa(rifa.id).subscribe({
      next: () => {
        this.mensaje.set('Rifa publicada correctamente.');
        this.error.set('');
        this.cargarDetalle();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo publicar la rifa.'),
    });
  }

  cancelar(rifa: RifaDetalle): void {
    if (!confirm('¿Cancelar esta rifa? Las compras pendientes se cancelarán.')) {
      return;
    }
    this.api.cancelarRifa(rifa.id).subscribe({
      next: () => {
        this.mensaje.set('Rifa cancelada.');
        this.error.set('');
        this.cargarDetalle();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo cancelar la rifa.'),
    });
  }

  editar(rifa: RifaDetalle): void {
    if (rifa.estado !== 'BORRADOR') {
      return;
    }
    this.formEdicion.patchValue({
      titulo: rifa.titulo,
      slug: rifa.slug,
      descripcion: rifa.descripcion || '',
      aclaracionSorteo: rifa.aclaracionSorteo || '',
      cantidadNumeros: rifa.cantidadNumeros,
      numerosPorFila: rifa.numerosPorFila,
      numeroInicial: rifa.numeroInicial,
      cantidadGanadores: rifa.cantidadGanadores,
      valorNumero: rifa.valorNumero,
      aliasCobroId: rifa.aliasCobroId || 0,
      aliasTransferencia: rifa.aliasTransferencia,
      whatsappComprobante: celularLocalArgentino(rifa.whatsappComprobante),
    });
    this.premios.clear();
    rifa.premios.forEach((premio) => {
      const control = this.crearPremio(premio.posicion);
      control.patchValue({ descripcion: premio.descripcion, imagenUrl: premio.imagenUrl || '' });
      this.premios.push(control);
    });
    this.api.listarAliasCobro().subscribe({
      next: (aliases) => {
        this.aliases.set(aliases);
        this.edicionAbierta.set(true);
        this.error.set('');
      },
      error: () => this.error.set('No se pudieron cargar los alias de cobro.'),
    });
  }

  cerrarEdicion(): void {
    this.edicionAbierta.set(false);
    this.guardandoEdicion.set(false);
    this.subiendoPremio.set(null);
  }

  sincronizarPremios(): void {
    const cantidad = this.formEdicion.controls.cantidadGanadores.value;
    while (this.premios.length < cantidad) {
      this.premios.push(this.crearPremio(this.premios.length + 1));
    }
    while (this.premios.length > cantidad) {
      this.premios.removeAt(this.premios.length - 1);
    }
  }

  subirImagenPremio(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.subiendoPremio.set(index);
    this.api.subirImagenPremio(archivo).subscribe({
      next: (media) => {
        this.premios.at(index).patchValue({ imagenUrl: media.url });
        this.subiendoPremio.set(null);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo subir la imagen del premio.');
        this.subiendoPremio.set(null);
      },
    });
  }

  guardarEdicion(): void {
    const rifa = this.rifa();
    if (!rifa) {
      return;
    }
    this.formEdicion.controls.slug.setValue(this.normalizarSlug(this.formEdicion.controls.slug.value));
    if (this.formEdicion.invalid) {
      this.formEdicion.markAllAsTouched();
      return;
    }
    if (!this.vistaPreviaNumeros()) {
      this.error.set('La cantidad total de números debe ser divisible por los números incluidos en cada fila.');
      return;
    }
    const alias = this.aliasSeleccionado();
    if (!alias || !alias.activo) {
      this.error.set('Tenes que seleccionar un alias de cobro activo.');
      return;
    }
    const raw = this.formEdicion.getRawValue();
    const payload = {
      ...raw,
      aliasCobroId: alias.id,
      aliasTransferencia: alias.alias,
      whatsappComprobante: normalizarCelularArgentino(raw.whatsappComprobante),
    };
    this.guardandoEdicion.set(true);
    this.api.editarRifa(rifa.id, payload).subscribe({
      next: () => {
        this.mensaje.set('Rifa actualizada correctamente.');
        this.error.set('');
        this.cerrarEdicion();
        this.cargarDetalle();
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo actualizar la rifa.');
        this.guardandoEdicion.set(false);
      },
    });
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

  private cargarCompras(rifaId: number, mostrarError = true): void {
    this.api.listarCompras().subscribe({
      next: (compras) => {
        this.compras.set(compras.filter((compra) => compra.rifaId === rifaId));
        this.ultimaActualizacionCompras.set(new Date());
      },
      error: () => {
        if (mostrarError) {
          this.error.set('No se pudieron cargar las compras de la rifa.');
        }
      },
    });
  }

  private generarMensajeWhatsApp(rifa: RifaDetalle, compras: Compra[]): string {
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    });
    const numerosPorFila = rifa.numeros[0]?.numerosIncluidos.length || 1;
    const premios = [...rifa.premios]
      .sort((a, b) => a.posicion - b.posicion)
      .map((premio) => {
        const descripcion = premio.descripcion
          .split(/\r?\n/)
          .map((linea) => linea.trim())
          .filter(Boolean)
          .map((linea) => (/^[*•-]/.test(linea) ? linea : `* ${linea}`))
          .join('\n');
        return `PREMIO ${premio.posicion}\n${descripcion}`;
      })
      .join('\n\n');

    const compradoresPorFila = new Map<string, string>();
    compras
      .filter((compra) => compra.estado !== 'CANCELADA')
      .sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion))
      .forEach((compra) => {
        compra.numeros.forEach((numeroCompra) => {
          const etiqueta = numeroCompra.split(' (', 1)[0].trim();
          compradoresPorFila.set(etiqueta, compra.nombre.trim());
        });
      });

    const filas = [...rifa.numeros]
      .sort((a, b) => a.valor - b.valor)
      .map((fila) => {
        const numeros = fila.numerosIncluidos.length ? fila.numerosIncluidos.join('_') : fila.etiqueta;
        const comprador = compradoresPorFila.get(fila.etiqueta);
        return comprador ? `${numeros} ${comprador}` : numeros;
      })
      .join('\n');

    const datosTransferencia = [
      'LAS TRANSFERENCIAS SE HACEN A:',
      '',
      `Alias: ${rifa.aliasTransferencia || '-'}`,
      rifa.aliasCobroEntidad ? `Banco: ${rifa.aliasCobroEntidad}` : '',
      rifa.aliasCobroCbuCvu ? `CBU/CVU: ${rifa.aliasCobroCbuCvu}` : '',
      rifa.aliasCobroTitular ? `A nombre de ${rifa.aliasCobroTitular}` : '',
    ].filter((linea) => linea !== '').join('\n');

    return [
      rifa.titulo.toUpperCase(),
      '',
      `${rifa.cantidadFilas} FILAS a sólo ${formatoMoneda.format(rifa.valorNumero)} CADA UNA (Incluye ${numerosPorFila} ${numerosPorFila === 1 ? 'número' : 'números'})`,
      '',
      premios,
      '',
      'Recuerden enviar el comprobante para validar su jugada.',
      '',
      filas,
      '',
      datosTransferencia,
      '',
      rifa.aclaracionSorteo ? `🍀 ${rifa.aclaracionSorteo}` : '',
      '',
      this.linkPublicoRifa(rifa),
    ].filter((linea, index, lineas) => linea !== '' || (index > 0 && lineas[index - 1] !== '')).join('\n').trim();
  }

  private crearPremio(posicion: number) {
    return this.fb.nonNullable.group({
      posicion: [posicion, [Validators.required, Validators.min(1)]],
      descripcion: ['', Validators.required],
      imagenUrl: [''],
    });
  }

  private normalizarSlug(valor: string): string {
    return valor
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
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
