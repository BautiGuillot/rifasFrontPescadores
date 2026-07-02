import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
  private readonly router = inject(Router);
  private marcaCargada = false;
  private readonly currentUrl = signal(this.router.url);

  readonly homeLink = computed(() => this.auth.isLoggedIn() ? '/admin' : '/login');
  readonly tenantColor = computed(() => this.auth.clienteColor() || '#082d50');
  readonly mostrarNavbar = computed(() => {
    const url = this.currentUrl().split('?')[0];
    return !url.startsWith('/r/') && !url.startsWith('/rifas/');
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));

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
