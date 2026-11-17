import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResaltarEstado } from '../directivas/resaltar-estado';
import type { Cita, EstadoCita } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
@Component({
  selector: 'app-agenda', imports: [ReactiveFormsModule, ResaltarEstado], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Mi agenda</h1>
    <p role="status" aria-live="polite">{{ pendientes() }} citas pendientes de {{ citas().length }}.</p>
    <p class="err" role="alert">{{ error() }}</p>
    @if (cargando()) { <p role="status">Cargando…</p> }
    @for (c of citas(); track c.id) {
      <article [appResaltarEstado]="c.estado"><b>{{ c.fecha }} · {{ c.hora }}</b> — {{ c.paciente ?? 'Paciente' }} · DNI {{ c.dniPaciente }} · {{ c.seguro }} <small>· Motivo: {{ c.motivo ?? 'No indicado' }}</small> <span class="pill" [attr.data-estado]="c.estado">{{ c.estado }}</span>
        @if (c.estado === 'Pendiente') { <button class="btn" type="button" [disabled]="cargando()" (click)="cambiar(c, 'Confirmada')">Confirmar</button> }
        @if (c.estado === 'Pendiente' || c.estado === 'Confirmada') { <button class="btn ghost" type="button" [disabled]="cargando()" (click)="cambiar(c, 'Cancelada')">Cancelar</button> }
        @if (c.estado === 'Confirmada' || c.estado === 'Atendida') { <button class="btn ghost" type="button" (click)="receta.set(c)">Emitir receta</button> }
      </article>
    } @empty { @if (!cargando()) { <p class="tabla" role="status">No tienes citas programadas.</p> } }
    @if (receta(); as r) {
      <form class="tabla" [formGroup]="form" (ngSubmit)="emitir(r)" novalidate style="display:grid;gap:10px;max-width:560px">
        <h2 style="font-size:20px">Receta para el DNI {{ r.dniPaciente }}</h2>
        <label>Medicamento<input formControlName="medicamento" [attr.aria-invalid]="malo('medicamento')"></label>
        <label>Cantidad (envases)<input type="number" formControlName="cantidad" min="1" max="99" [attr.aria-invalid]="malo('cantidad')"></label>
        <label>Indicaciones<input formControlName="indicaciones" [attr.aria-invalid]="malo('indicaciones')"></label>
        <p class="err" role="alert">@if (intento() && form.invalid) { Completa medicamento (3+ letras), cantidad entre 1 y 99 e indicaciones (5+ letras). }</p>
        <div style="display:flex;gap:8px"><button class="btn brand" type="submit" [disabled]="cargando()">Guardar receta</button><button class="btn ghost" type="button" (click)="receta.set(null)">Cancelar</button></div>
      </form> }
    <p role="status" aria-live="polite">{{ aviso() }}</p></section>`,
})
export class Agenda {
  private readonly api = inject(CurarApi); private readonly auth = inject(Auth);
  protected readonly citas = signal<readonly Cita[]>([]); protected readonly cargando = signal(false); protected readonly error = signal('');
  protected readonly receta = signal<Cita | null>(null); protected readonly aviso = signal(''); protected readonly intento = signal(false);
  protected readonly pendientes = computed(() => this.citas().filter((c) => c.estado === 'Pendiente').length);
  protected readonly form = inject(FormBuilder).nonNullable.group({ medicamento: ['', [Validators.required, Validators.minLength(3)]], cantidad: [1, [Validators.required, Validators.min(1), Validators.max(99)]], indicaciones: ['', [Validators.required, Validators.minLength(5)]] });
  constructor() { const id = this.auth.usuario()?.medicoId; if (id) ejecutar(this.api.citasDeMedico(id), this.cargando, this.error, (l) => this.citas.set(l)); else this.error.set('Tu cuenta no tiene un perfil médico asociado.'); }
  protected malo(c: 'medicamento' | 'cantidad' | 'indicaciones'): boolean { const x = this.form.controls[c]; return x.invalid && (x.touched || this.intento()); }
  protected cambiar(c: Cita, estado: EstadoCita): void { if (this.cargando()) return; ejecutar(this.api.cambiarEstado(c.id, estado), this.cargando, this.error, (n) => this.citas.update((l) => l.map((x) => (x.id === c.id ? n : x)))); }
  protected emitir(c: Cita): void {
    this.intento.set(true); this.aviso.set('');
    const u = this.auth.usuario(); if (this.form.invalid || !u || this.cargando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    ejecutar(this.api.crearReceta({ dniPaciente: c.dniPaciente, paciente: c.paciente ?? '', medicoId: c.medicoId, medicoNombre: u.nombre, fecha: new Date().toISOString().slice(0, 10), medicamento: v.medicamento.trim(), cantidad: v.cantidad, indicaciones: v.indicaciones.trim() }),
      this.cargando, this.error, () => { this.aviso.set('Receta emitida.'); this.receta.set(null); this.form.reset(); this.intento.set(false); });
  }
}
