import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Compra, NumeroRifa, RifaDetalle } from '../../core/api.models';
import { RifasApiService } from '../../core/rifas-api.service';

@Component({
  selector: 'app-rifa-detalle',
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './rifa-detalle.component.html',
})
export class RifaDetalleComponent implements OnDestroy {
  private readonly api = inject(RifasApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly rifa = signal<RifaDetalle | null>(null);
  readonly seleccion = signal<number[]>([]);
  readonly compra = signal<Compra | null>(null);
  readonly error = signal('');
  readonly comprobanteMensaje = signal('');
  readonly enviando = signal(false);
  readonly subiendoComprobante = signal(false);
  readonly marcandoWhatsapp = signal(false);
  readonly segundosRestantes = signal(0);
  private cuentaRegresivaId: number | null = null;
  private readonly slug = this.route.snapshot.paramMap.get('slug');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    dni: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^\+?[1-9][0-9]{7,14}$/)]],
  });

  readonly total = computed(() => {
    const rifa = this.rifa();
    return rifa ? this.seleccion().length * rifa.valorNumero : 0;
  });

  readonly numerosSeleccionados = computed(() => {
    const rifa = this.rifa();
    if (!rifa) {
      return [];
    }
    return this.seleccion()
      .map((valor) => rifa.numeros.find((numero) => numero.valor === valor))
      .filter((numero): numero is NumeroRifa => !!numero);
  });

  readonly seleccionEtiquetas = computed(() =>
    this.numerosSeleccionados().map((numero) => numero.etiqueta).join(', '),
  );

  readonly compraConComprobante = computed(() => {
    const compra = this.compra();
    return !!compra?.comprobanteArchivo || !!compra?.comprobanteWhatsapp;
  });

  readonly cuentaRegresiva = computed(() => {
    const segundos = this.segundosRestantes();
    const minutos = Math.floor(segundos / 60).toString().padStart(2, '0');
    const restantes = (segundos % 60).toString().padStart(2, '0');
    return `${minutos}:${restantes}`;
  });

  constructor() {
    if (this.slug) {
      this.cargarPorSlug(this.slug);
    } else {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.cargar(id);
    }
  }

  ngOnDestroy(): void {
    this.detenerCuentaRegresiva();
  }

  toggle(numero: NumeroRifa): void {
    if (this.rifa()?.estado !== 'PUBLICADA' || numero.estado !== 'DISPONIBLE' || this.compra()) {
      return;
    }
    const actual = this.seleccion();
    this.seleccion.set(
      actual.includes(numero.valor)
        ? actual.filter((valor) => valor !== numero.valor)
        : [...actual, numero.valor].sort((a, b) => a - b),
    );
  }

  confirmar(): void {
    const rifa = this.rifa();
    if (!rifa || !this.seleccion().length || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    const request = { ...this.form.getRawValue(), numeros: this.seleccion() };
    const compra$ = this.slug ? this.api.comprarPorSlug(this.slug, request) : this.api.comprar(rifa.id, request);
    compra$.subscribe({
      next: (compra) => {
        this.compra.set(compra);
        this.iniciarCuentaRegresiva(compra);
        this.enviando.set(false);
        this.slug ? this.cargarPorSlug(this.slug) : this.cargar(rifa.id);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo registrar la compra.');
        this.enviando.set(false);
      },
    });
  }

  whatsappUrl(compra: Compra): string {
    const numeros = compra.numeros.join(', ');
    const text = `Hola, realicé una compra para la rifa ${compra.rifaTitulo}. Números: ${numeros}. Nombre: ${compra.nombre}.`;
    return `https://wa.me/${this.whatsappNumero(compra.whatsappComprobante)}?text=${encodeURIComponent(text)}`;
  }

  colorPrincipal(rifa: RifaDetalle): string {
    return rifa.clienteColorPrincipal || '#082d50';
  }

  mediaUrl(url?: string | null): string {
    return this.api.mediaUrl(url);
  }

  cargarComprobante(event: Event): void {
    const compra = this.compra();
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!compra || !archivo) {
      return;
    }
    this.subiendoComprobante.set(true);
    this.comprobanteMensaje.set('');
    this.api.cargarComprobante(compra.id, archivo).subscribe({
      next: (actualizada) => {
        this.compra.set(actualizada);
        this.detenerCuentaRegresiva();
        this.comprobanteMensaje.set('Comprobante cargado.');
        this.subiendoComprobante.set(false);
      },
      error: (error) => {
        this.comprobanteMensaje.set(error.error?.message || 'No se pudo cargar el comprobante.');
        this.subiendoComprobante.set(false);
      },
    });
  }

  marcarComprobanteWhatsapp(): void {
    const compra = this.compra();
    if (!compra) {
      return;
    }
    this.marcandoWhatsapp.set(true);
    this.comprobanteMensaje.set('');
    this.api.marcarComprobanteWhatsapp(compra.id).subscribe({
      next: (actualizada) => {
        this.compra.set(actualizada);
        this.detenerCuentaRegresiva();
        this.comprobanteMensaje.set('Quedó registrado que enviaste el comprobante por WhatsApp.');
        this.marcandoWhatsapp.set(false);
      },
      error: (error) => {
        this.comprobanteMensaje.set(error.error?.message || 'No se pudo registrar el aviso por WhatsApp.');
        this.marcandoWhatsapp.set(false);
      },
    });
  }

  private cargar(id: number): void {
    this.error.set('');
    this.api.detalleRifa(id).subscribe({
      next: (rifa) => this.rifa.set(rifa),
      error: (error) => this.error.set(error.error?.message || 'No se pudo cargar la rifa.'),
    });
  }

  private cargarPorSlug(slug: string): void {
    this.error.set('');
    this.api.detalleRifaPorSlug(slug).subscribe({
      next: (rifa) => this.rifa.set(rifa),
      error: (error) => this.error.set(error.error?.message || 'No se pudo cargar la rifa.'),
    });
  }

  private whatsappNumero(numero: string): string {
    return numero.replace(/\D/g, '');
  }

  private iniciarCuentaRegresiva(compra: Compra): void {
    this.detenerCuentaRegresiva();
    if (compra.comprobanteArchivo || compra.comprobanteWhatsapp) {
      this.segundosRestantes.set(0);
      return;
    }
    const actualizar = () => {
      const expiracion = new Date(compra.fechaExpiracion).getTime();
      const restantes = Math.max(0, Math.ceil((expiracion - Date.now()) / 1000));
      this.segundosRestantes.set(restantes);
      if (restantes === 0) {
        this.detenerCuentaRegresiva();
        this.expirarCompra(compra.id);
      }
    };
    actualizar();
    this.cuentaRegresivaId = window.setInterval(actualizar, 1000);
  }

  private detenerCuentaRegresiva(): void {
    if (this.cuentaRegresivaId !== null) {
      window.clearInterval(this.cuentaRegresivaId);
      this.cuentaRegresivaId = null;
    }
  }

  private expirarCompra(compraId: number): void {
    this.api.expirarCompra(compraId).subscribe({
      next: (actualizada) => {
        this.compra.set(null);
        this.seleccion.set([]);
        this.comprobanteMensaje.set('');
        this.error.set(actualizada.estado === 'CANCELADA'
          ? 'La reserva venció y los números fueron liberados.'
          : '');
        this.slug ? this.cargarPorSlug(this.slug) : this.cargar(actualizada.rifaId);
      },
      error: (error) => this.error.set(error.error?.message || 'La reserva venció.'),
    });
  }
}
