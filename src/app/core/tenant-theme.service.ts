import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantThemeService {
  readonly publicColor = signal<string | null>(null);

  setPublicColor(color?: string | null): void {
    this.publicColor.set(color || null);
  }

  clearPublicColor(): void {
    this.publicColor.set(null);
  }
}
