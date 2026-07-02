import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RifasApiService } from '../../core/rifas-api.service';
import { RifaResumen } from '../../core/api.models';

@Component({
  selector: 'app-finalizadas',
  imports: [DatePipe],
  templateUrl: './finalizadas.component.html',
})
export class FinalizadasComponent {
  private readonly api = inject(RifasApiService);
  readonly rifas = signal<RifaResumen[]>([]);
  readonly cargando = signal(true);

  constructor() {
    this.api.listarFinalizadas().subscribe({
      next: (rifas) => {
        this.rifas.set(rifas);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
