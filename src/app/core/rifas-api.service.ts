import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  AliasCobro,
  AliasCobroDetalle,
  AliasCobroRequest,
  Compra,
  CompraSeguimiento,
  Cliente,
  CrearClienteRequest,
  CrearRifaRequest,
  DashboardAdmin,
  EstadoCompra,
  MediaResponse,
  RifaDetalle,
  RifaResumen,
} from './api.models';

@Injectable({ providedIn: 'root' })
export class RifasApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  mediaUrl(url?: string | null): string {
    if (!url) {
      return '';
    }
    if (/^(https?:|data:|blob:)/i.test(url)) {
      return url;
    }
    if (url.startsWith('/api/')) {
      return `${this.apiOrigin()}${url}`;
    }
    return url;
  }

  listarPublicadas() {
    return this.http.get<RifaResumen[]>(`${this.baseUrl}/rifas`);
  }

  listarFinalizadas() {
    return this.http.get<RifaResumen[]>(`${this.baseUrl}/rifas/finalizadas`);
  }

  detalleRifa(id: number) {
    return this.http.get<RifaDetalle>(`${this.baseUrl}/rifas/${id}`);
  }

  detalleRifaPorSlug(slug: string) {
    return this.http.get<RifaDetalle>(`${this.baseUrl}/rifas/slug/${slug}`);
  }

  comprar(rifaId: number, request: { nombre: string; telefono: string; numeros: number[] }) {
    return this.http.post<Compra>(`${this.baseUrl}/rifas/${rifaId}/compras`, request);
  }

  comprarPorSlug(slug: string, request: { nombre: string; telefono: string; numeros: number[] }) {
    return this.http.post<Compra>(`${this.baseUrl}/rifas/slug/${slug}/compras`, request);
  }

  cargarComprobante(compraId: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Compra>(`${this.baseUrl}/rifas/compras/${compraId}/comprobante`, formData);
  }

  marcarComprobanteWhatsapp(compraId: number) {
    return this.http.post<Compra>(`${this.baseUrl}/rifas/compras/${compraId}/comprobante-whatsapp`, {});
  }

  expirarCompra(compraId: number) {
    return this.http.post<Compra>(`${this.baseUrl}/rifas/compras/${compraId}/expirar`, {});
  }

  seguimientoCompra(compraId: number, token: string) {
    return this.http.get<CompraSeguimiento>(
      `${this.baseUrl}/rifas/compras/${compraId}/seguimiento?token=${encodeURIComponent(token)}`,
    );
  }

  dashboard() {
    return this.http.get<DashboardAdmin>(`${this.baseUrl}/admin/rifas/dashboard`);
  }

  listarAdminRifas() {
    return this.http.get<RifaResumen[]>(`${this.baseUrl}/admin/rifas`);
  }

  crearRifa(request: CrearRifaRequest) {
    return this.http.post<RifaDetalle>(`${this.baseUrl}/admin/rifas`, request);
  }

  editarRifa(id: number, request: CrearRifaRequest) {
    return this.http.put<RifaDetalle>(`${this.baseUrl}/admin/rifas/${id}`, request);
  }

  publicarRifa(id: number) {
    return this.http.patch<RifaDetalle>(`${this.baseUrl}/admin/rifas/${id}/publicar`, {});
  }

  finalizarRifa(id: number) {
    return this.http.patch<RifaDetalle>(`${this.baseUrl}/admin/rifas/${id}/finalizar`, {});
  }

  finalizarRifaConGanadores(id: number, ganadores: { posicion: number; numero: number }[]) {
    return this.http.post<RifaDetalle>(`${this.baseUrl}/admin/rifas/${id}/finalizar-con-ganadores`, { ganadores });
  }

  cancelarRifa(id: number) {
    return this.http.patch<RifaDetalle>(`${this.baseUrl}/admin/rifas/${id}/cancelar`, {});
  }

  eliminarRifa(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/admin/rifas/${id}`);
  }

  cargarGanadores(rifaId: number, ganadores: { posicion: number; numero: number }[]) {
    return this.http.post<RifaDetalle>(`${this.baseUrl}/admin/rifas/${rifaId}/ganadores`, { ganadores });
  }

  listarCompras(estado?: EstadoCompra) {
    const query = estado ? `?estado=${estado}` : '';
    return this.http.get<Compra[]>(`${this.baseUrl}/admin/compras${query}`);
  }

  aprobarCompra(id: number) {
    return this.http.patch<Compra>(`${this.baseUrl}/admin/compras/${id}/aprobar`, {});
  }

  cancelarCompra(id: number) {
    return this.http.patch<Compra>(`${this.baseUrl}/admin/compras/${id}/cancelar`, {});
  }

  descargarComprobante(id: number) {
    return this.http.get(`${this.baseUrl}/admin/compras/${id}/comprobante`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  listarClientes() {
    return this.http.get<Cliente[]>(`${this.baseUrl}/super-admin/clientes`);
  }

  crearCliente(request: CrearClienteRequest) {
    return this.http.post<Cliente>(`${this.baseUrl}/super-admin/clientes`, request);
  }

  actualizarCliente(id: number, request: CrearClienteRequest) {
    return this.http.put<Cliente>(`${this.baseUrl}/super-admin/clientes/${id}`, request);
  }

  subirLogoCliente(id: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Cliente>(`${this.baseUrl}/super-admin/clientes/${id}/logo`, formData);
  }

  actualizarEstadoCliente(id: number, estado: 'ACTIVO' | 'INACTIVO') {
    return this.http.patch<Cliente>(`${this.baseUrl}/super-admin/clientes/${id}/estado`, { estado });
  }

  eliminarCliente(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/super-admin/clientes/${id}`);
  }

  obtenerMiMarca() {
    return this.http.get<Cliente>(`${this.baseUrl}/admin/cliente/marca`);
  }

  actualizarMiMarca(request: {
    colorPrincipal: string;
    logoUrl?: string;
    twilioWhatsappHabilitado?: boolean;
    twilioWhatsappFrom?: string;
    twilioMessagingServiceSid?: string;
    twilioContentSid?: string;
    whatsappConsultas?: string;
  }) {
    return this.http.put<Cliente>(`${this.baseUrl}/admin/cliente/marca`, request);
  }

  subirMiLogo(archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Cliente>(`${this.baseUrl}/admin/cliente/marca/logo`, formData);
  }

  subirImagenPremio(archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<MediaResponse>(`${this.baseUrl}/admin/media/premios`, formData);
  }

  listarAliasCobro(soloActivos = false, desde?: string, hasta?: string) {
    const params = new URLSearchParams({ soloActivos: String(soloActivos) });
    if (desde) {
      params.set('desde', desde);
    }
    if (hasta) {
      params.set('hasta', hasta);
    }
    return this.http.get<AliasCobro[]>(`${this.baseUrl}/admin/alias-cobro?${params.toString()}`);
  }

  detalleAliasCobro(id: number, desde?: string, hasta?: string) {
    const params = new URLSearchParams();
    if (desde) {
      params.set('desde', desde);
    }
    if (hasta) {
      params.set('hasta', hasta);
    }
    const query = params.size ? `?${params.toString()}` : '';
    return this.http.get<AliasCobroDetalle>(`${this.baseUrl}/admin/alias-cobro/${id}${query}`);
  }

  crearAliasCobro(request: AliasCobroRequest) {
    return this.http.post<AliasCobro>(`${this.baseUrl}/admin/alias-cobro`, request);
  }

  actualizarAliasCobro(id: number, request: AliasCobroRequest) {
    return this.http.put<AliasCobro>(`${this.baseUrl}/admin/alias-cobro/${id}`, request);
  }

  actualizarEstadoAliasCobro(id: number, activo: boolean) {
    return this.http.patch<AliasCobro>(`${this.baseUrl}/admin/alias-cobro/${id}/estado`, { activo });
  }

  private apiOrigin(): string {
    return new URL(this.baseUrl, window.location.origin).origin;
  }
}
