export type EstadoRifa = 'BORRADOR' | 'PUBLICADA' | 'FINALIZADA' | 'CANCELADA';
export type EstadoNumero = 'DISPONIBLE' | 'PENDIENTE' | 'VENDIDO';
export type EstadoCompra = 'PENDIENTE_PAGO' | 'APROBADA' | 'CANCELADA';
export type EstadoCliente = 'ACTIVO' | 'INACTIVO';
export type RolUsuario = 'SUPER_ADMIN' | 'CLIENTE_ADMIN';

export interface Premio {
  id?: number;
  posicion: number;
  descripcion: string;
  imagenUrl?: string;
}

export interface Ganador {
  posicion: number;
  numero: string;
  premio: string;
  nombreComprador: string;
  telefonoComprador: string;
}

export interface NumeroRifa {
  id: number;
  valor: number;
  etiqueta: string;
  numerosIncluidos: string[];
  estado: EstadoNumero;
}

export interface RifaResumen {
  id: number;
  titulo: string;
  slug: string;
  clienteId?: number;
  clienteNombre?: string;
  clienteColorPrincipal?: string;
  clienteLogoUrl?: string;
  descripcion: string;
  aclaracionSorteo?: string;
  cantidadNumeros: number;
  cantidadFilas: number;
  cantidadGanadores: number;
  valorNumero: number;
  aliasCobroId?: number;
  aliasCobroNombre?: string;
  aliasCobroEntidad?: string;
  aliasCobroTitular?: string;
  aliasCobroCbuCvu?: string;
  aliasTransferencia?: string;
  estado: EstadoRifa;
  fechaCreacion: string;
  fechaSorteo?: string;
  premios: Premio[];
  ganadores: Ganador[];
}

export interface RifaDetalle extends RifaResumen {
  aliasTransferencia: string;
  whatsappComprobante: string;
  numeros: NumeroRifa[];
}

export interface CrearRifaRequest {
  titulo: string;
  slug: string;
  descripcion: string;
  aclaracionSorteo?: string;
  cantidadNumeros: number;
  cantidadFilas: number;
  cantidadGanadores: number;
  valorNumero: number;
  aliasCobroId?: number;
  aliasTransferencia?: string;
  whatsappComprobante: string;
  premios: Premio[];
}

export interface Compra {
  id: number;
  rifaId: number;
  rifaTitulo: string;
  nombre: string;
  dni: string;
  telefono: string;
  numeros: string[];
  total: number;
  estado: EstadoCompra;
  fechaCreacion: string;
  fechaExpiracion: string;
  comprobanteArchivo?: string;
  comprobanteWhatsapp: boolean;
  twilioMensajeSid?: string;
  whatsappAutomaticoEstado?: 'NO_CONFIGURADO' | 'ENVIADO' | 'ERROR';
  whatsappAutomaticoError?: string;
  fechaWhatsappAutomatico?: string;
  aliasCobroId?: number;
  aliasCobroNombre?: string;
  aliasCobroEntidad?: string;
  aliasCobroTitular?: string;
  aliasCobroCbuCvu?: string;
  aliasTransferencia: string;
  whatsappComprobante: string;
}

export interface DashboardAdmin {
  rifasBorrador: number;
  rifasPublicadas: number;
  rifasFinalizadas: number;
  rifasCanceladas: number;
  comprasPendientes: number;
  comprasAprobadas: number;
  comprasCanceladas: number;
  numerosDisponibles: number;
  numerosPendientes: number;
  numerosVendidos: number;
  recaudacionAprobada: number;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  rol: RolUsuario;
  clienteId?: number;
  clienteNombre?: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  slug: string;
  colorPrincipal: string;
  logoUrl?: string;
  twilioWhatsappHabilitado: boolean;
  twilioWhatsappFrom?: string;
  twilioMessagingServiceSid?: string;
  twilioContentSid?: string;
  whatsappConsultas?: string;
  estado: EstadoCliente;
  username: string;
  fechaAlta: string;
}

export interface CrearClienteRequest {
  nombre: string;
  slug: string;
  colorPrincipal?: string;
  logoUrl?: string;
  twilioWhatsappHabilitado?: boolean;
  twilioWhatsappFrom?: string;
  twilioMessagingServiceSid?: string;
  twilioContentSid?: string;
  whatsappConsultas?: string;
  username: string;
  password?: string;
}

export interface MediaResponse {
  url: string;
  referencia: string;
  nombreOriginal: string;
  contentType: string;
}

export interface AliasCobro {
  id: number;
  nombre: string;
  alias: string;
  entidad?: string;
  titular?: string;
  cbuCvu?: string;
  activo: boolean;
  fechaCreacion: string;
  rifasAsociadas: number;
  comprasAprobadas: number;
  recaudacionAprobada: number;
}

export interface AliasCobroRifa {
  id: number;
  titulo: string;
  slug: string;
  estado: EstadoRifa;
  valorNumero: number;
  fechaCreacion: string;
  fechaSorteo?: string;
  comprasPendientes: number;
  comprasAprobadas: number;
  comprasCanceladas: number;
  recaudacionAprobada: number;
}

export interface AliasCobroDetalle {
  alias: AliasCobro;
  rifas: AliasCobroRifa[];
}

export interface AliasCobroRequest {
  nombre: string;
  alias: string;
  entidad?: string;
  titular?: string;
  cbuCvu?: string;
  activo?: boolean;
}
