import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, Compra, DashboardAdmin, EstadoCompra, EstadoRifa, RifaResumen } from '../../core/api.models';
import { AuthService } from '../../core/auth.service';
import { RifasApiService } from '../../core/rifas-api.service';

type AdminTab = 'dashboard' | 'rifas' | 'compras' | 'marca';

@Component({
  selector: 'app-admin',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  private readonly api = inject(RifasApiService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly tab = signal<AdminTab>('dashboard');
  readonly dashboard = signal<DashboardAdmin | null>(null);
  readonly rifas = signal<RifaResumen[]>([]);
  readonly compras = signal<Compra[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly miMarca = signal<Cliente | null>(null);
  readonly modalRifaAbierto = signal(false);
  readonly rifaFiltro = signal<EstadoRifa | ''>('');
  readonly compraFiltro = signal<EstadoCompra | ''>('PENDIENTE_PAGO');
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly subiendoLogo = signal(false);
  readonly logoClienteArchivo = signal<File | null>(null);
  readonly subiendoLogoCliente = signal(false);
  readonly subiendoPremio = signal<number | null>(null);
  readonly editandoRifaId = signal<number | null>(null);
  readonly editandoClienteId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,80}$/)]],
    descripcion: [''],
    aclaracionSorteo: [''],
    cantidadNumeros: [100, [Validators.required, Validators.min(1)]],
    cantidadFilas: [100, [Validators.required, Validators.min(1)]],
    cantidadGanadores: [1, [Validators.required, Validators.min(1)]],
    valorNumero: [1000, [Validators.required, Validators.min(1)]],
    aliasTransferencia: ['', Validators.required],
    whatsappComprobante: ['', [Validators.required, Validators.pattern(/^\+?[1-9][0-9]{7,14}$/)]],
    premios: this.fb.array([this.crearPremio(1)]),
  });

  readonly clienteForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,80}$/)]],
    colorPrincipal: ['#082d50', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    logoUrl: [''],
    username: ['', Validators.required],
    password: [''],
  });

  readonly marcaForm = this.fb.nonNullable.group({
    colorPrincipal: ['#082d50', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    logoUrl: [''],
  });

  readonly rifasFiltradas = computed(() => {
    const filtro = this.rifaFiltro();
    return filtro ? this.rifas().filter((rifa) => rifa.estado === filtro) : this.rifas();
  });

  constructor() {
    this.auth.rol() === 'SUPER_ADMIN' ? this.cargarClientes() : this.cargarTodo();
  }

  get premios(): FormArray {
    return this.form.controls.premios;
  }

  cambiarTab(tab: AdminTab): void {
    this.tab.set(tab);
  }

  guardarMarca(): void {
    if (this.marcaForm.invalid) {
      this.marcaForm.markAllAsTouched();
      return;
    }
    const raw = this.marcaForm.getRawValue();
    this.api.actualizarMiMarca({
      colorPrincipal: raw.colorPrincipal,
      logoUrl: raw.logoUrl || undefined,
    }).subscribe({
      next: (cliente) => {
        this.miMarca.set(cliente);
        this.auth.actualizarColorCliente(cliente.colorPrincipal);
        this.marcaForm.reset({
          colorPrincipal: cliente.colorPrincipal || '#082d50',
          logoUrl: cliente.logoUrl || '',
        });
        this.mensaje.set('Marca actualizada.');
        this.error.set('');
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo actualizar la marca.'),
    });
  }

  subirLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      return;
    }
    this.subiendoLogo.set(true);
    this.api.subirMiLogo(archivo).subscribe({
      next: (cliente) => {
        this.miMarca.set(cliente);
        this.auth.actualizarColorCliente(cliente.colorPrincipal);
        this.marcaForm.patchValue({ logoUrl: cliente.logoUrl || '' });
        this.mensaje.set('Logo actualizado.');
        this.error.set('');
        this.subiendoLogo.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo subir el logo.');
        this.subiendoLogo.set(false);
      },
    });
  }

  seleccionarLogoCliente(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.logoClienteArchivo.set(input.files?.[0] || null);
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
        this.mensaje.set('Imagen de premio cargada.');
        this.error.set('');
        this.subiendoPremio.set(null);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo subir la imagen del premio.');
        this.subiendoPremio.set(null);
      },
    });
  }

  sincronizarPremios(): void {
    const cantidad = this.form.controls.cantidadGanadores.value;
    while (this.premios.length < cantidad) {
      this.premios.push(this.crearPremio(this.premios.length + 1));
    }
    while (this.premios.length > cantidad) {
      this.premios.removeAt(this.premios.length - 1);
    }
  }

  abrirCrearRifa(): void {
    this.limpiarFormularioRifa();
    this.modalRifaAbierto.set(true);
  }

  cambiarFiltroRifas(estado: EstadoRifa | ''): void {
    this.rifaFiltro.set(estado);
  }

  guardarRifa(): void {
    this.form.controls.slug.setValue(this.normalizarSlug(this.form.controls.slug.value));
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisá los datos de la rifa. El slug debe tener solo letras, números y guiones.');
      return;
    }
    const raw = this.form.getRawValue();
    const editandoId = this.editandoRifaId();
    const request = editandoId ? this.api.editarRifa(editandoId, raw) : this.api.crearRifa(raw);
    request.subscribe({
      next: () => {
        this.mensaje.set(editandoId ? 'Rifa actualizada correctamente.' : 'Rifa creada correctamente.');
        this.error.set('');
        this.tab.set('rifas');
        this.rifaFiltro.set('');
        this.limpiarFormularioRifa();
        this.cargarTodo();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo guardar la rifa.'),
    });
  }

  editar(rifa: RifaResumen): void {
    if (rifa.estado !== 'BORRADOR') {
      this.error.set('Solo se pueden editar rifas en borrador.');
      return;
    }
    this.api.detalleRifa(rifa.id).subscribe({
      next: (detalle) => {
        this.editandoRifaId.set(detalle.id);
        this.modalRifaAbierto.set(true);
        this.form.patchValue({
          titulo: detalle.titulo,
          slug: detalle.slug,
          descripcion: detalle.descripcion || '',
          aclaracionSorteo: detalle.aclaracionSorteo || '',
          cantidadNumeros: detalle.cantidadNumeros,
          cantidadFilas: detalle.cantidadFilas,
          cantidadGanadores: detalle.cantidadGanadores,
          valorNumero: detalle.valorNumero,
          aliasTransferencia: detalle.aliasTransferencia,
          whatsappComprobante: detalle.whatsappComprobante,
        });
        this.premios.clear();
        detalle.premios.forEach((premio) => {
          const control = this.crearPremio(premio.posicion);
          control.patchValue({ descripcion: premio.descripcion, imagenUrl: premio.imagenUrl || '' });
          this.premios.push(control);
        });
        this.mensaje.set('');
        this.error.set('');
      },
      error: () => this.error.set('No se pudo cargar la rifa para editar.'),
    });
  }

  cancelarEdicion(): void {
    this.limpiarFormularioRifa();
  }

  linkPublicoRifa(rifa: RifaResumen): string {
    return `${window.location.origin}/r/${rifa.slug}`;
  }

  copiarLinkRifa(rifa: RifaResumen): void {
    navigator.clipboard.writeText(this.linkPublicoRifa(rifa)).then(
      () => this.mensaje.set('Link copiado.'),
      () => this.error.set('No se pudo copiar el link.'),
    );
  }

  publicar(id: number): void {
    if (!confirm('¿Publicar esta rifa? Quedará visible para los clientes.')) {
      return;
    }
    this.api.publicarRifa(id).subscribe(() => this.cargarTodo());
  }

  finalizar(id: number): void {
    const rifa = this.rifas().find((item) => item.id === id);
    if (!rifa) {
      this.error.set('No se pudo encontrar la rifa.');
      return;
    }
    const ganadores = this.pedirGanadores(rifa);
    if (!ganadores) {
      return;
    }
    if (!confirm('¿Finalizar esta rifa y publicar los ganadores? Ya no se podrán realizar compras.')) {
      return;
    }
    this.api.finalizarRifaConGanadores(id, ganadores).subscribe({
      next: () => {
        this.mensaje.set('Rifa finalizada con ganadores cargados.');
        this.cargarTodo();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo finalizar la rifa.'),
    });
  }

  cancelar(id: number): void {
    if (!confirm('¿Cancelar esta rifa? Las compras pendientes se cancelarán.')) {
      return;
    }
    this.api.cancelarRifa(id).subscribe(() => this.cargarTodo());
  }

  eliminar(rifa: RifaResumen): void {
    if (rifa.estado !== 'CANCELADA') {
      this.error.set('Solo se pueden eliminar rifas canceladas.');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente la rifa "${rifa.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.api.eliminarRifa(rifa.id).subscribe({
      next: () => {
        this.mensaje.set('Rifa eliminada.');
        this.cargarTodo();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo eliminar la rifa.'),
    });
  }

  cargarCompras(estado: EstadoCompra | '' = this.compraFiltro()): void {
    this.compraFiltro.set(estado);
    this.api.listarCompras(estado || undefined).subscribe({
      next: (compras) => this.compras.set(compras),
      error: () => this.error.set('No se pudieron cargar las compras.'),
    });
  }

  aprobarCompra(id: number): void {
    if (!confirm('¿Aprobar esta compra y marcar los números como ocupados?')) {
      return;
    }
    this.api.aprobarCompra(id).subscribe(() => this.cargarTodo());
  }

  cancelarCompra(id: number): void {
    if (!confirm('¿Cancelar esta compra y liberar sus números?')) {
      return;
    }
    this.api.cancelarCompra(id).subscribe(() => this.cargarTodo());
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

  guardarCliente(): void {
    const editandoId = this.editandoClienteId();
    this.clienteForm.controls.password.setErrors(null);
    if (!editandoId && !this.clienteForm.controls.password.value) {
      this.clienteForm.controls.password.setErrors({ required: true });
    }
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }
    const raw = this.clienteForm.getRawValue();
    const request = editandoId
      ? this.api.actualizarCliente(editandoId, raw)
      : this.api.crearCliente(raw);
    request.subscribe({
      next: (cliente) => this.guardarLogoClienteSiCorresponde(cliente, editandoId ? 'Cliente actualizado.' : 'Cliente creado.'),
      error: (error) => this.error.set(error.error?.message || 'No se pudo guardar el cliente.'),
    });
  }

  editarCliente(cliente: Cliente): void {
    this.editandoClienteId.set(cliente.id);
    this.clienteForm.reset({
      nombre: cliente.nombre,
      slug: cliente.slug,
      colorPrincipal: cliente.colorPrincipal || '#082d50',
      logoUrl: cliente.logoUrl || '',
      username: cliente.username,
      password: '',
    });
    this.mensaje.set('');
    this.error.set('');
  }

  cancelarEdicionCliente(): void {
    this.limpiarFormularioCliente();
  }

  cambiarEstadoCliente(cliente: Cliente): void {
    const estado = cliente.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (!confirm(`¿Cambiar cliente a ${estado}?`)) {
      return;
    }
    this.api.actualizarEstadoCliente(cliente.id, estado).subscribe({
      next: () => this.cargarClientes(),
      error: (error) => this.error.set(error.error?.message || 'No se pudo actualizar el cliente.'),
    });
  }

  whatsappUrl(numero: string): string {
    return `https://wa.me/${numero.replace(/\D/g, '')}`;
  }

  mediaUrl(url?: string | null): string {
    return this.api.mediaUrl(url);
  }

  private pedirGanadores(rifa: RifaResumen): { posicion: number; numero: number }[] | null {
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

  private cargarTodo(): void {
    this.api.dashboard().subscribe((dashboard) => this.dashboard.set(dashboard));
    this.api.listarAdminRifas().subscribe((rifas) => this.rifas.set(rifas));
    this.cargarMiMarca();
    this.cargarCompras(this.compraFiltro());
  }

  private cargarMiMarca(): void {
    this.api.obtenerMiMarca().subscribe({
      next: (cliente) => {
        this.miMarca.set(cliente);
        this.auth.actualizarColorCliente(cliente.colorPrincipal);
        this.marcaForm.reset({
          colorPrincipal: cliente.colorPrincipal || '#082d50',
          logoUrl: cliente.logoUrl || '',
        });
      },
      error: () => this.error.set('No se pudo cargar la marca.'),
    });
  }

  private cargarClientes(): void {
    this.api.listarClientes().subscribe({
      next: (clientes) => this.clientes.set(clientes),
      error: () => this.error.set('No se pudieron cargar los clientes.'),
    });
  }

  private limpiarFormularioCliente(): void {
    this.editandoClienteId.set(null);
    this.logoClienteArchivo.set(null);
    this.clienteForm.reset({ nombre: '', slug: '', colorPrincipal: '#082d50', logoUrl: '', username: '', password: '' });
  }

  private guardarLogoClienteSiCorresponde(cliente: Cliente, mensaje: string): void {
    const archivo = this.logoClienteArchivo();
    if (!archivo) {
      this.mensaje.set(mensaje);
      this.limpiarFormularioCliente();
      this.cargarClientes();
      return;
    }
    this.subiendoLogoCliente.set(true);
    this.api.subirLogoCliente(cliente.id, archivo).subscribe({
      next: () => {
        this.subiendoLogoCliente.set(false);
        this.mensaje.set(`${mensaje} Logo actualizado.`);
        this.limpiarFormularioCliente();
        this.cargarClientes();
      },
      error: (error) => {
        this.subiendoLogoCliente.set(false);
        this.error.set(error.error?.message || 'El cliente se guardó, pero no se pudo subir el logo.');
        this.limpiarFormularioCliente();
        this.cargarClientes();
      },
    });
  }

  private limpiarFormularioRifa(): void {
    this.editandoRifaId.set(null);
    this.modalRifaAbierto.set(false);
    this.form.reset({
      titulo: '',
      slug: '',
      descripcion: '',
      aclaracionSorteo: '',
      cantidadNumeros: 100,
      cantidadFilas: 100,
      cantidadGanadores: 1,
      valorNumero: 1000,
      aliasTransferencia: '',
      whatsappComprobante: '',
    });
    this.premios.clear();
    this.premios.push(this.crearPremio(1));
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

  private crearPremio(posicion: number) {
    return this.fb.nonNullable.group({
      posicion: [posicion, Validators.required],
      descripcion: ['', Validators.required],
      imagenUrl: [''],
    });
  }

}
