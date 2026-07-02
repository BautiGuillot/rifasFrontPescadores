import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { LoginResponse, RolUsuario } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private readonly accessToken = signal(localStorage.getItem('accessToken'));
  private readonly refreshToken = signal(localStorage.getItem('refreshToken'));
  private readonly rolSignal = signal<RolUsuario | null>((localStorage.getItem('rol') as RolUsuario | null) || null);
  private readonly clienteNombreSignal = signal(localStorage.getItem('clienteNombre'));
  private readonly clienteColorSignal = signal(localStorage.getItem('clienteColor'));

  readonly isLoggedIn = computed(() => this.tokenVigente(this.accessToken()));
  readonly rol = computed(() => this.isLoggedIn() ? this.rolSignal() : null);
  readonly clienteNombre = computed(() => this.clienteNombreSignal());
  readonly clienteColor = computed(() => this.clienteColorSignal());

  get token(): string | null {
    return this.accessToken();
  }

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap((response) => this.guardarSesion(response)),
    );
  }

  refresh() {
    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token'));
    }
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap((response) => this.guardarSesion(response)),
      catchError((error) => {
        this.limpiarSesion();
        return throwError(() => error);
      }),
    );
  }

  logout(): void {
    const refreshToken = this.refreshToken();
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
    this.limpiarSesion();
    this.router.navigateByUrl('/');
  }

  actualizarColorCliente(color: string | null | undefined): void {
    if (color) {
      localStorage.setItem('clienteColor', color);
    } else {
      localStorage.removeItem('clienteColor');
    }
    this.clienteColorSignal.set(color || null);
  }

  private guardarSesion(response: LoginResponse): void {
    localStorage.setItem('accessToken', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('rol', response.rol);
    if (response.clienteNombre) {
      localStorage.setItem('clienteNombre', response.clienteNombre);
    } else {
      localStorage.removeItem('clienteNombre');
    }
    this.accessToken.set(response.token);
    this.refreshToken.set(response.refreshToken);
    this.rolSignal.set(response.rol);
    this.clienteNombreSignal.set(response.clienteNombre || null);
  }

  private limpiarSesion(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rol');
    localStorage.removeItem('clienteNombre');
    localStorage.removeItem('clienteColor');
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.rolSignal.set(null);
    this.clienteNombreSignal.set(null);
    this.clienteColorSignal.set(null);
  }

  private tokenVigente(token: string | null): boolean {
    if (!token) {
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
