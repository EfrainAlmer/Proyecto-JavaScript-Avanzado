import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import type { BorradorCita, Cita, Familiar, Favorito, Medico, Sede } from '../modelos/cita';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
import { mensajeHttp } from '../servicios/mensaje-http';
@Injectable({ providedIn: 'root' })
export class CitasStore {
  private readonly api = inject(CurarApi);
  readonly medicos = signal<readonly Medico[]>([]);
  readonly citas = signal<readonly Cita[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly total = computed(() => this.citas().length);
  readonly activas = computed(() => this.citas().filter((c) => c.estado !== 'Cancelada').length);
  readonly sedes = signal<readonly Sede[]>([]);
  readonly citasMedico = signal<readonly Cita[]>([]);
  readonly activos = computed(() => this.medicos().filter((m) => m.estado !== 'Inactivo'));
  cargarSedes(): void { if (this.sedes().length) return; ejecutar(this.api.sedes(), this.cargando, this.error, (l) => this.sedes.set(l)); }
  cargarCitasMedico(id: string): void { ejecutar(this.api.citasDeMedico(id), this.cargando, this.error, (l) => this.citasMedico.set(l)); }
  atender(id: string): void { if (this.guardando()) return; ejecutar(this.api.cambiarEstado(id, 'Atendida'), this.guardando, this.error, (c) => this.citasMedico.update((l) => l.map((x) => (x.id === id ? c : x)))); }
    cancelarMedico(id: string): void { if (this.guardando()) return; ejecutar(this.api.cambiarEstado(id, 'Cancelada'), this.guardando, this.error, (c) => this.citasMedico.update((l) => l.map((x) => (x.id === id ? c : x)))); }
  readonly familiares = signal<readonly Familiar[]>([]);
  cargarFamiliares(dni: string): void { ejecutar(this.api.familiares(dni), this.cargando, this.error, (l) => this.familiares.set(l)); }
  readonly favoritos = signal<readonly Favorito[]>([]);
  cargarFavoritos(dni: string): void { ejecutar(this.api.favoritos(dni), this.cargando, this.error, (l) => this.favoritos.set(l)); }
  alternarFavorito(dni: string, medicoId: string): void {
    if (this.guardando()) return;
    const f = this.favoritos().find((x) => x.medicoId === medicoId);
    if (f?.id) ejecutar(this.api.quitarFavorito(f.id), this.guardando, this.error, () => this.favoritos.update((l) => l.filter((x) => x.id !== f.id)));
    else ejecutar(this.api.agregarFavorito({ dni, medicoId }), this.guardando, this.error, (n) => this.favoritos.update((l) => [...l, n]));
  }
  cargarMedicos(): void {
    if (this.medicos().length) return;
    this.cargando.set(true); this.error.set('');
    this.api.medicos().pipe(finalize(() => this.cargando.set(false))).subscribe({ next: (l) => this.medicos.set(l), error: (e) => this.error.set(mensajeHttp(e)) });
  }
  cargarCitas(dni: string): void {
    this.cargando.set(true); this.error.set('');
    this.api.citas(dni).pipe(finalize(() => this.cargando.set(false))).subscribe({ next: (l) => this.citas.set(l), error: (e) => this.error.set(mensajeHttp(e)) });
  }
  reservar(b: BorradorCita, ok: () => void): void {
    if (this.guardando()) return; // evita duplicados mientras hay una solicitud en curso
    this.guardando.set(true); this.error.set('');
    this.api.crear(b).pipe(finalize(() => this.guardando.set(false))).subscribe({ next: (c) => { this.citas.update((l) => [...l, c]); ok(); }, error: (e) => this.error.set(mensajeHttp(e)) });
  }
  cancelar(id: string): void {
    if (this.guardando()) return;
    this.guardando.set(true); this.error.set('');
    this.api.cancelar(id).pipe(finalize(() => this.guardando.set(false))).subscribe({ next: (c) => this.citas.update((l) => l.map((x) => (x.id === id ? c : x))), error: (e) => this.error.set(mensajeHttp(e)) });
  }
}
