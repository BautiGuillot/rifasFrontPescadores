import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AliasCobro, AliasCobroDetalle, Cliente, Compra, DashboardAdmin, EstadoCompra, EstadoRifa, RifaResumen } from '../../core/api.models';
import { AuthService } from '../../core/auth.service';
import { RifasApiService } from '../../core/rifas-api.service';
import { celularLocalArgentino, normalizarCelularArgentino, VALIDACION_CELULAR_ARGENTINA } from '../../core/telefono-argentina';

type AdminTab = 'dashboard' | 'rifas' | 'compras' | 'alias' | 'marca';

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
  readonly aliases = signal<AliasCobro[]>([]);
  readonly aliasDetalle = signal<AliasCobroDetalle | null>(null);
  readonly cargandoAliasDetalle = signal(false);
  readonly clientes = signal<Cliente[]>([]);
  readonly miMarca = signal<Cliente | null>(null);
  readonly modalRifaAbierto = signal(false);
  readonly rifaFiltro = signal<EstadoRifa | ''>('');
  readonly compraFiltro = signal<EstadoCompra | ''>('PENDIENTE_PAGO');
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly errorRifa = signal('');
  readonly subiendoLogo = signal(false);
  readonly logoClienteArchivo = signal<File | null>(null);
  readonly subiendoLogoCliente = signal(false);
  readonly subiendoPremio = signal<number | null>(null);
  readonly editandoRifaId = signal<number | null>(null);
  readonly editandoClienteId = signal<number | null>(null);
  readonly editandoAliasId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,80}$/)]],
    descripcion: [''],
    aclaracionSorteo: [''],
    cantidadNumeros: [100, [Validators.required, Validators.min(1)]],
    cantidadFilas: [100, [Validators.required, Validators.min(1)]],
    cantidadGanadores: [1, [Validators.required, Validators.min(1)]],
    valorNumero: [1000, [Validators.required, Validators.min(1)]],
    aliasCobroId: [0, [Validators.required, Validators.min(1)]],
    aliasTransferencia: [''],
    whatsappComprobante: ['', [Validators.required, Validators.pattern(VALIDACION_CELULAR_ARGENTINA)]],
    premios: this.fb.array([this.crearPremio(1)]),
  });

  readonly clienteForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]{3,80}$/)]],
    colorPrincipal: ['#082d50', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    logoUrl: [''],
    twilioWhatsappHabilitado: [false],
    twilioWhatsappFrom: [''],
    twilioMessagingServiceSid: [''],
    twilioContentSid: [''],
    whatsappConsultas: ['', Validators.pattern(VALIDACION_CELULAR_ARGENTINA)],
    username: ['', Validators.required],
    password: [''],
  });

  readonly marcaForm = this.fb.nonNullable.group({
    colorPrincipal: ['#082d50', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    logoUrl: [''],
    twilioWhatsappHabilitado: [false],
    twilioWhatsappFrom: [''],
    twilioMessagingServiceSid: [''],
    twilioContentSid: [''],
    whatsappConsultas: ['', Validators.pattern(VALIDACION_CELULAR_ARGENTINA)],
  });

  readonly aliasForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    alias: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,64}$/)]],
    entidad: [''],
    titular: [''],
    cbuCvu: [''],
    activo: [true],
  });

  readonly rifasFiltradas = computed(() => {
    const filtro = this.rifaFiltro();
    return filtro ? this.rifas().filter((rifa) => rifa.estado === filtro) : this.rifas();
  });

  readonly aliasesActivos = computed(() => this.aliases().filter((alias) => alias.activo));

  readonly aliasSeleccionado = computed(() => {
    const id = Number(this.form.controls.aliasCobroId.value);
    return this.aliases().find((alias) => alias.id === id) || null;
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
      twilioWhatsappHabilitado: raw.twilioWhatsappHabilitado,
      twilioWhatsappFrom: raw.twilioWhatsappFrom || undefined,
      twilioMessagingServiceSid: raw.twilioMessagingServiceSid || undefined,
      twilioContentSid: raw.twilioContentSid || undefined,
      whatsappConsultas: raw.whatsappConsultas ? normalizarCelularArgentino(raw.whatsappConsultas) : undefined,
    }).subscribe({
      next: (cliente) => {
        this.miMarca.set(cliente);
        this.auth.actualizarColorCliente(cliente.colorPrincipal);
        this.marcaForm.reset({
          colorPrincipal: cliente.colorPrincipal || '#082d50',
          logoUrl: cliente.logoUrl || '',
          twilioWhatsappHabilitado: cliente.twilioWhatsappHabilitado || false,
          twilioWhatsappFrom: cliente.twilioWhatsappFrom || '',
          twilioMessagingServiceSid: cliente.twilioMessagingServiceSid || '',
          twilioContentSid: cliente.twilioContentSid || '',
          whatsappConsultas: celularLocalArgentino(cliente.whatsappConsultas),
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
        this.errorRifa.set('');
        this.subiendoPremio.set(null);
      },
      error: (error) => {
        this.errorRifa.set(error.error?.message || 'No se pudo subir la imagen del premio.');
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
    this.errorRifa.set('');
    this.modalRifaAbierto.set(true);
  }

  cambiarFiltroRifas(estado: EstadoRifa | ''): void {
    this.rifaFiltro.set(estado);
  }

  aliasRifa(rifa: RifaResumen): string {
    if (rifa.aliasCobroNombre && rifa.aliasTransferencia) {
      return `${rifa.aliasCobroNombre} · ${rifa.aliasTransferencia}`;
    }
    if (rifa.aliasCobroNombre) {
      return rifa.aliasCobroNombre;
    }
    const aliasPorId = rifa.aliasCobroId
      ? this.aliases().find((alias) => alias.id === rifa.aliasCobroId)
      : null;
    if (aliasPorId) {
      return `${aliasPorId.nombre} · ${aliasPorId.alias}`;
    }
    const aliasTexto = rifa.aliasTransferencia?.trim();
    if (aliasTexto) {
      const aliasPorTexto = this.aliases().find((alias) => alias.alias.toLowerCase() === aliasTexto.toLowerCase());
      return aliasPorTexto ? `${aliasPorTexto.nombre} · ${aliasPorTexto.alias}` : aliasTexto;
    }
    return 'Sin alias asignado';
  }

  guardarRifa(): void {
    this.form.controls.slug.setValue(this.normalizarSlug(this.form.controls.slug.value));
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorRifa.set(this.mensajeErrorFormularioRifa());
      return;
    }
    const raw = this.form.getRawValue();
    const alias = this.aliasSeleccionado();
    if (!alias) {
      this.errorRifa.set('Tenes que seleccionar un alias de cobro activo.');
      return;
    }
    const payload = {
      ...raw,
      aliasCobroId: Number(raw.aliasCobroId),
      aliasTransferencia: alias.alias,
      whatsappComprobante: normalizarCelularArgentino(raw.whatsappComprobante),
    };
    const editandoId = this.editandoRifaId();
    const request = editandoId ? this.api.editarRifa(editandoId, payload) : this.api.crearRifa(payload);
    request.subscribe({
      next: () => {
        this.mensaje.set(editandoId ? 'Rifa actualizada correctamente.' : 'Rifa creada correctamente.');
        this.error.set('');
        this.errorRifa.set('');
        this.tab.set('rifas');
        this.rifaFiltro.set('');
        this.limpiarFormularioRifa();
        this.cargarTodo();
      },
      error: (error) => this.errorRifa.set(error.error?.message || 'No se pudo guardar la rifa.'),
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
        this.errorRifa.set('');
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
          aliasCobroId: detalle.aliasCobroId || 0,
          aliasTransferencia: detalle.aliasTransferencia,
          whatsappComprobante: celularLocalArgentino(detalle.whatsappComprobante),
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
    this.errorRifa.set('');
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

  guardarAlias(): void {
    if (this.aliasForm.invalid) {
      this.aliasForm.markAllAsTouched();
      return;
    }
    const raw = this.aliasForm.getRawValue();
    const payload = {
      nombre: raw.nombre,
      alias: raw.alias,
      entidad: raw.entidad || undefined,
      titular: raw.titular || undefined,
      cbuCvu: raw.cbuCvu || undefined,
      activo: raw.activo,
    };
    const editandoId = this.editandoAliasId();
    const request = editandoId
      ? this.api.actualizarAliasCobro(editandoId, payload)
      : this.api.crearAliasCobro(payload);
    request.subscribe({
      next: () => {
        this.mensaje.set(editandoId ? 'Alias actualizado.' : 'Alias creado.');
        this.error.set('');
        this.limpiarFormularioAlias();
        this.cargarAliases();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo guardar el alias.'),
    });
  }

  editarAlias(alias: AliasCobro): void {
    this.editandoAliasId.set(alias.id);
    this.aliasForm.reset({
      nombre: alias.nombre,
      alias: alias.alias,
      entidad: alias.entidad || '',
      titular: alias.titular || '',
      cbuCvu: alias.cbuCvu || '',
      activo: alias.activo,
    });
    this.mensaje.set('');
    this.error.set('');
  }

  cancelarEdicionAlias(): void {
    this.limpiarFormularioAlias();
  }

  verAlias(alias: AliasCobro): void {
    this.cargandoAliasDetalle.set(true);
    this.aliasDetalle.set(null);
    this.api.detalleAliasCobro(alias.id).subscribe({
      next: (detalle) => {
        this.aliasDetalle.set(detalle);
        this.cargandoAliasDetalle.set(false);
        this.error.set('');
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo cargar el resumen del alias.');
        this.cargandoAliasDetalle.set(false);
      },
    });
  }

  cerrarDetalleAlias(): void {
    this.aliasDetalle.set(null);
    this.cargandoAliasDetalle.set(false);
  }

  cambiarEstadoAlias(alias: AliasCobro): void {
    const activo = !alias.activo;
    if (!confirm(`${activo ? 'Activar' : 'Inactivar'} este alias?`)) {
      return;
    }
    this.api.actualizarEstadoAliasCobro(alias.id, activo).subscribe({
      next: () => {
        this.mensaje.set(activo ? 'Alias activado.' : 'Alias inactivado.');
        this.cargarAliases();
      },
      error: (error) => this.error.set(error.error?.message || 'No se pudo actualizar el alias.'),
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
    const requestPayload = {
      ...raw,
      whatsappConsultas: raw.whatsappConsultas ? normalizarCelularArgentino(raw.whatsappConsultas) : undefined,
    };
    const request = editandoId
      ? this.api.actualizarCliente(editandoId, requestPayload)
      : this.api.crearCliente(requestPayload);
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
      twilioWhatsappHabilitado: cliente.twilioWhatsappHabilitado || false,
      twilioWhatsappFrom: cliente.twilioWhatsappFrom || '',
      twilioMessagingServiceSid: cliente.twilioMessagingServiceSid || '',
      twilioContentSid: cliente.twilioContentSid || '',
      whatsappConsultas: celularLocalArgentino(cliente.whatsappConsultas),
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
    return `https://wa.me/${normalizarCelularArgentino(numero)}`;
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
    this.cargarAliases();
    this.cargarMiMarca();
    this.cargarCompras(this.compraFiltro());
  }


  private cargarAliases(): void {
    this.api.listarAliasCobro().subscribe({
      next: (aliases) => this.aliases.set(aliases),
      error: () => this.error.set('No se pudieron cargar los alias.'),
    });
  }

  private cargarMiMarca(): void {
    this.api.obtenerMiMarca().subscribe({
      next: (cliente) => {
        this.miMarca.set(cliente);
        this.auth.actualizarColorCliente(cliente.colorPrincipal);
        this.marcaForm.reset({
          colorPrincipal: cliente.colorPrincipal || '#082d50',
          logoUrl: cliente.logoUrl || '',
          twilioWhatsappHabilitado: cliente.twilioWhatsappHabilitado || false,
          twilioWhatsappFrom: cliente.twilioWhatsappFrom || '',
          twilioMessagingServiceSid: cliente.twilioMessagingServiceSid || '',
          twilioContentSid: cliente.twilioContentSid || '',
          whatsappConsultas: celularLocalArgentino(cliente.whatsappConsultas),
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
    this.clienteForm.reset({
      nombre: '',
      slug: '',
      colorPrincipal: '#082d50',
      logoUrl: '',
      twilioWhatsappHabilitado: false,
      twilioWhatsappFrom: '',
      twilioMessagingServiceSid: '',
      twilioContentSid: '',
      whatsappConsultas: '',
      username: '',
      password: '',
    });
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
      aliasCobroId: this.aliasesActivos()[0]?.id || 0,
      aliasTransferencia: '',
      whatsappComprobante: '',
    });
    this.premios.clear();
    this.premios.push(this.crearPremio(1));
  }

  private mensajeErrorFormularioRifa(): string {
    const controles = this.form.controls;
    if (controles.titulo.hasError('required')) {
      return 'Completá el título de la rifa.';
    }
    if (controles.slug.hasError('required')) {
      return 'Completá el slug público para generar el link de la rifa.';
    }
    if (controles.slug.hasError('pattern')) {
      return 'El slug público debe tener entre 3 y 80 caracteres: letras, números o guiones.';
    }
    if (controles.cantidadNumeros.invalid) {
      return 'Indicá una cantidad de números mayor a cero.';
    }
    if (controles.cantidadFilas.invalid) {
      return 'Indicá una cantidad de filas mayor a cero.';
    }
    if (controles.cantidadGanadores.invalid) {
      return 'Indicá al menos un ganador.';
    }
    if (controles.valorNumero.invalid) {
      return 'Indicá un valor por número mayor a cero.';
    }
    if (controles.aliasCobroId.invalid) {
      return 'Seleccioná un alias de cobro.';
    }
    if (controles.whatsappComprobante.hasError('required')) {
      return 'Completá el WhatsApp para comprobantes.';
    }
    if (controles.whatsappComprobante.hasError('pattern')) {
      return 'El WhatsApp debe tener entre 8 y 10 dígitos, sin el 0 ni el 15.';
    }

    for (let indice = 0; indice < this.premios.length; indice += 1) {
      const premio = this.premios.at(indice);
      if (premio.get('descripcion')?.invalid) {
        return `Completá la descripción del premio ${premio.get('posicion')?.value ?? indice + 1}.`;
      }
    }
    return 'Revisá los datos obligatorios de la rifa.';
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

  private limpiarFormularioAlias(): void {
    this.editandoAliasId.set(null);
    this.aliasForm.reset({
      nombre: '',
      alias: '',
      entidad: '',
      titular: '',
      cbuCvu: '',
      activo: true,
    });
  }

}
