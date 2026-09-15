import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { Compra, RifaDetalle } from '../../core/api.models';
import { RifasApiService } from '../../core/rifas-api.service';
import { RifaDetalleComponent } from './rifa-detalle.component';

const detalle: RifaDetalle = {
  id: 1, slug: 'prueba', titulo: 'Rifa', estado: 'PUBLICADA', valorNumero: 1000,
  cantidadFilas: 2, cantidadNumeros: 2, cantidadGanadores: 1,
  aliasTransferencia: 'rifa.prueba', whatsappComprobante: '5491123456789',
  descripcion: '', numerosPorFila: 1, numeroInicial: 0, fechaCreacion: '2026-09-15',
  premios: [], ganadores: [],
  numeros: [
    { id: 1, valor: 0, etiqueta: '00', numerosIncluidos: ['00'], estado: 'DISPONIBLE' },
    { id: 2, valor: 1, etiqueta: '01', numerosIncluidos: ['01'], estado: 'VENDIDO', compradorNombre: 'Ana Pérez' },
  ],
};

const realizada: Compra = {
  id: 10, rifaId: 1, nombre: 'Juan Pérez', numeros: ['00'], total: 1000,
  rifaTitulo: 'Rifa', telefono: '5491123456789', fechaCreacion: '2026-09-15',
  comprobanteWhatsapp: false, aliasTransferencia: 'rifa.prueba', whatsappComprobante: '5491123456789',
  estado: 'PENDIENTE_PAGO', fechaExpiracion: new Date(Date.now() + 300000).toISOString(),
};

describe('Confirmación de compra pública', () => {
  async function preparar(slug = true) {
    const respuesta = new Subject<Compra>();
    const api = {
      detalleRifaPorSlug: vi.fn().mockReturnValue(of(detalle)),
      detalleRifa: vi.fn().mockReturnValue(of(detalle)),
      comprarPorSlug: vi.fn().mockReturnValue(respuesta),
      comprar: vi.fn().mockReturnValue(respuesta),
      mediaUrl: vi.fn().mockReturnValue(''),
      cargarComprobante: vi.fn(),
      marcarComprobanteWhatsapp: vi.fn(),
      seguimientoCompra: vi.fn().mockReturnValue(of({ estado: 'PENDIENTE_PAGO', comprobanteRecibido: true })),
    };
    await TestBed.configureTestingModule({
      imports: [RifaDetalleComponent],
      providers: [
        { provide: RifasApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(slug ? { slug: 'prueba' } : { id: '1' }) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RifaDetalleComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    for (const selector of ['#numeros-rifa', '#datos-compra']) {
      fixture.nativeElement.querySelector(selector).scrollIntoView = vi.fn();
    }
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const abrir = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.showModal = abrir;
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    component.form.setValue({ nombre: 'Juan Pérez', telefono: '1123456789', aceptaCondiciones: true });
    component.toggle(detalle.numeros[0]);
    return { fixture, component, respuesta, api, dialog, abrir };
  }

  for (const slug of [true, false]) {
    it(`pide confirmación antes de registrar por ${slug ? 'slug' : 'id'} y muestra las opciones de pago`, async () => {
      const { fixture, component, respuesta, api, dialog } = await preparar(slug);
      const comprar = slug ? api.comprarPorSlug : api.comprar;
      component.confirmar();
      fixture.detectChanges();
      expect(dialog.open).toBe(true);
      expect(dialog.textContent).toContain('Confirmá tu compra');
      expect(dialog.textContent).toContain('(00)');
      expect(dialog.textContent).toContain('Juan Pérez');
      expect(comprar).not.toHaveBeenCalled();
      component.registrarCompra();
      component.registrarCompra();
      expect(comprar).toHaveBeenCalledTimes(1);
      const actualizada = { ...detalle, numeros: detalle.numeros.map((n) => n.valor === 0 ? { ...n, estado: 'PENDIENTE', compradorNombre: realizada.nombre } : n) };
      api.detalleRifaPorSlug.mockReturnValue(of(actualizada));
      api.detalleRifa.mockReturnValue(of(actualizada));
      respuesta.next(realizada);
      fixture.detectChanges();
      expect(dialog.open).toBe(false);
      expect(component.seleccion()).toEqual([]);
      expect(fixture.nativeElement.querySelector('#numeros-rifa .selected')).toBeNull();
      expect(fixture.nativeElement.querySelector('#numeros-rifa .pending')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#comprador-1').textContent).toContain('Juan Pérez');
      const pago = fixture.nativeElement.querySelector('#datos-compra');
      expect(pago.textContent).toContain('Gracias por tu compra');
      expect(pago.textContent).toContain('Cargar comprobante');
      expect(pago.textContent).toContain('Abrir WhatsApp');
      expect(pago.scrollIntoView).toHaveBeenCalledOnce();
      fixture.destroy();
    });
  }

  it('permite volver a editar sin registrar ni perder los números', async () => {
    const { fixture, component, api, dialog } = await preparar();
    component.confirmar();
    component.cerrarConfirmacionCompra();
    component.registrarCompra();
    expect(dialog.open).toBe(false);
    expect(api.comprarPorSlug).not.toHaveBeenCalled();
    expect(component.seleccion()).toEqual([0]);
    fixture.destroy();
  });

  it('no abre la confirmación si faltan datos', async () => {
    const { fixture, component, abrir, api } = await preparar();
    component.form.controls.nombre.setValue('');
    component.confirmar();
    expect(abrir).not.toHaveBeenCalled();
    expect(api.comprarPorSlug).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('mantiene el diálogo y la selección si falla el registro', async () => {
    const { fixture, component, respuesta, dialog } = await preparar();
    component.confirmar();
    component.registrarCompra();
    respuesta.error({ error: { message: 'Número ocupado' } });
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Número ocupado');
    expect(component.compra()).toBeNull();
    expect(component.seleccion()).toEqual([0]);
    expect(component.enviando()).toBe(false);
    fixture.destroy();
  });

  for (const metodo of ['archivo', 'whatsapp'] as const) {
    for (const exito of [true, false]) {
      it(`${metodo}: ${exito ? 'refresca tras completar' : 'permite reintentar sin refrescar tras error'}`, async () => {
        const { fixture, component, api } = await preparar();
        const envio = new Subject<Compra>();
        const compra = { ...realizada, tokenSeguimiento: 'token-prueba' };
        component.compra.set(compra);
        component.seleccion.set([]);
        fixture.detectChanges();
        const grilla = fixture.nativeElement.querySelector('#numeros-rifa') as HTMLElement;
        if (metodo === 'archivo') {
          api.cargarComprobante.mockReturnValue(envio);
          component.cargarComprobante({ target: { files: [new File(['pago'], 'pago.png', { type: 'image/png' })] } } as unknown as Event);
        } else {
          api.marcarComprobanteWhatsapp.mockReturnValue(envio);
          component.marcarComprobanteWhatsapp();
        }
        expect(api.detalleRifaPorSlug).toHaveBeenCalledTimes(1);
        if (exito) {
          envio.next({ ...compra, comprobanteArchivo: metodo === 'archivo' ? 'pago.png' : undefined, comprobanteWhatsapp: metodo === 'whatsapp' });
          fixture.detectChanges();
          expect(api.detalleRifaPorSlug).toHaveBeenCalledTimes(2);
          expect(grilla.scrollIntoView).toHaveBeenCalledOnce();
          expect(component.compraConComprobante()).toBe(true);
        } else {
          envio.error({ error: { message: 'Reintentá el envío' } });
          expect(api.detalleRifaPorSlug).toHaveBeenCalledTimes(1);
          expect(grilla.scrollIntoView).not.toHaveBeenCalled();
          expect(component.comprobanteMensaje()).toBe('Reintentá el envío');
          expect(component.subiendoComprobante()).toBe(false);
          expect(component.marcandoWhatsapp()).toBe(false);
        }
        fixture.destroy();
      });
    }
  }
});
