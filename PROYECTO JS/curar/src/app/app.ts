import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ROLE_ADMIN, ROLE_MEDICO } from './modelos/cita';
import { Auth } from './servicios/auth';
@Component({ selector: 'app-root', imports: [RouterLink, RouterOutlet], templateUrl: './app.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class App {
  protected readonly auth = inject(Auth);
  protected readonly rol = computed<'anonimo' | 'paciente' | 'medico' | 'admin'>(() => { const r = this.auth.usuario()?.rol ?? 0; return !r ? 'anonimo' : r & ROLE_ADMIN ? 'admin' : r & ROLE_MEDICO ? 'medico' : 'paciente'; });
}
