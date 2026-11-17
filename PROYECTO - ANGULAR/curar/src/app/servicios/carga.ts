import type { WritableSignal } from '@angular/core';
import { finalize, type Observable } from 'rxjs';
import { mensajeHttp } from './mensaje-http';
/** Patrón común: marca carga, limpia el error y traduce los fallos HTTP a un mensaje. */
export function ejecutar<T>(obs: Observable<T>, cargando: WritableSignal<boolean>, error: WritableSignal<string>, ok: (v: T) => void): void {
  cargando.set(true); error.set('');
  obs.pipe(finalize(() => cargando.set(false))).subscribe({ next: ok, error: (e) => error.set(mensajeHttp(e)) });
}
