import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RifasApiService } from '../../core/rifas-api.service';
import { RifaResumen } from '../../core/api.models';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly api = inject(RifasApiService);
  readonly rifas = signal<RifaResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.listarPublicadas().subscribe({
      next: (rifas) => {
        this.rifas.set(rifas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las rifas.');
        this.cargando.set(false);
      },
    });
  }
}
