import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { RifasApiService } from './core/rifas-api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly api = inject(RifasApiService);
  private marcaCargada = false;

  readonly homeLink = computed(() => this.auth.isLoggedIn() ? '/admin' : '/login');
  readonly tenantColor = computed(() => this.auth.clienteColor() || '#082d50');

  constructor() {
    effect(() => {
      if (!this.auth.isLoggedIn() || this.auth.rol() !== 'CLIENTE_ADMIN') {
        this.marcaCargada = false;
        return;
      }
      if (this.marcaCargada) {
        return;
      }
      this.marcaCargada = true;
      this.api.obtenerMiMarca().subscribe({
        next: (cliente) => this.auth.actualizarColorCliente(cliente.colorPrincipal),
        error: () => undefined,
      });
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
