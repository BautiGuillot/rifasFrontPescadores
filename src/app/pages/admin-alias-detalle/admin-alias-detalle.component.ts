import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AliasCobroDetalle, EstadoRifa } from '../../core/api.models';
import { RifasApiService } from '../../core/rifas-api.service';

@Component({
  selector: 'app-admin-alias-detalle',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-alias-detalle.component.html',
})
export class AdminAliasDetalleComponent {
  private readonly api = inject(RifasApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly aliasId = Number(this.route.snapshot.paramMap.get('id'));

  readonly detalle = signal<AliasCobroDetalle | null>(null);
  readonly cargando = signal(true);
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly estado = signal<EstadoRifa | ''>('');
  readonly filtroForm = this.fb.nonNullable.group({
    desde: [''],
    hasta: [''],
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
    const rifas = this.detalle()?.rifas ?? [];
    const estado = this.estado();
    return estado ? rifas.filter((rifa) => rifa.estado === estado) : rifas;
  });

  constructor() {
    if (!Number.isInteger(this.aliasId) || this.aliasId <= 0) {
      this.error.set('El alias solicitado no es válido.');
      this.cargando.set(false);
      return;
    }
    this.cargarDetalle();
  }

  aplicarFiltro(): void {
    const { desde, hasta } = this.filtroForm.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.error.set('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    this.cargarDetalle();
  }

  limpiarFiltro(): void {
    this.filtroForm.reset({ desde: '', hasta: '' });
    this.estado.set('');
    this.cargarDetalle();
  }

  cambiarEstado(estado: string): void {
    this.estado.set(estado as EstadoRifa | '');
  }

  filtroFechaActivo(): boolean {
    const { desde, hasta } = this.filtroForm.getRawValue();
    return !!desde || !!hasta;
  }

  abrirEdicion(): void {
    const alias = this.detalle()?.alias;
    if (!alias) {
      return;
    }
    this.aliasForm.reset({
      nombre: alias.nombre,
      alias: alias.alias,
      entidad: alias.entidad || '',
      titular: alias.titular || '',
      cbuCvu: alias.cbuCvu || '',
      activo: alias.activo,
    });
    this.error.set('');
    this.mensaje.set('');
    this.editando.set(true);
  }

  cerrarEdicion(): void {
    this.editando.set(false);
  }

  guardarAlias(): void {
    if (this.aliasForm.invalid) {
      this.aliasForm.markAllAsTouched();
      return;
    }
    const raw = this.aliasForm.getRawValue();
    this.guardando.set(true);
    this.error.set('');
    this.api.actualizarAliasCobro(this.aliasId, {
      nombre: raw.nombre,
      alias: raw.alias,
      entidad: raw.entidad || undefined,
      titular: raw.titular || undefined,
      cbuCvu: raw.cbuCvu || undefined,
      activo: raw.activo,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(false);
        this.mensaje.set('Alias actualizado correctamente.');
        this.cargarDetalle();
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo actualizar el alias.');
        this.guardando.set(false);
      },
    });
  }

  private cargarDetalle(): void {
    const { desde, hasta } = this.filtroForm.getRawValue();
    this.cargando.set(true);
    this.error.set('');
    this.api.detalleAliasCobro(this.aliasId, desde || undefined, hasta || undefined).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(error.error?.message || 'No se pudo cargar el detalle del alias.');
        this.cargando.set(false);
      },
    });
  }
}
