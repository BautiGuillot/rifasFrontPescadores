import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { AdminAliasDetalleComponent } from './pages/admin-alias-detalle/admin-alias-detalle.component';
import { AdminRifaDetalleComponent } from './pages/admin-rifa-detalle/admin-rifa-detalle.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './pages/login/login.component';
import { RifaDetalleComponent } from './pages/rifa-detalle/rifa-detalle.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'rifas/:id', component: RifaDetalleComponent },
  { path: 'r/:slug', component: RifaDetalleComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin/alias/:id', component: AdminAliasDetalleComponent, canActivate: [adminGuard] },
  { path: 'admin/rifas/:id', component: AdminRifaDetalleComponent, canActivate: [adminGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: 'login' },
];
