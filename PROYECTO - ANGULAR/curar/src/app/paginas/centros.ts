import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import type { Comentario, Sede } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
@Component({
  selector: 'app-centros', imports: [ReactiveFormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Centros de salud</h1>
    <p style="margin:6px 0 16px">Hospitales, policlínicos y clínicas con su ubicación, especialidades, contacto y calificaciones.</p>
    <div role="group" aria-label="Tipo de centro" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      @for (t of tipos; track t) { <button type="button" class="btn" [class.ghost]="tipo() !== t" [attr.aria-pressed]="tipo() === t" (click)="tipo.set(t)">{{ t }}</button> }</div>
    <p class="err" role="alert">{{ store.error() }}{{ error() }}</p>
    <div class="docs">@for (s of sedes(); track s.id) {
      <article class="tabla"><h2 style="font-size:20px">{{ s.nombre }}</h2><span class="pill">{{ s.tipo }}</span>
        <p style="margin-top:8px"><b>Ubicación:</b> {{ s.direccion }}<br><a class="link" target="_blank" rel="noopener" [href]="mapa(s)">Ver en el mapa ↗</a></p>
        <p><b>Contacto:</b> {{ s.telefono ?? 'No disponible' }}</p>
        <p><b>Seguros:</b> {{ s.seguros.join(' · ') }}</p>
        <p><b>Especialidades:</b> {{ especialidades(s.id) }}</p>
        <p><b>Calificación:</b> {{ promedio(s.id) }}</p>
        <button class="btn ghost" type="button" [attr.aria-expanded]="sel() === s.id" (click)="sel.set(sel() === s.id ? '' : s.id)">{{ sel() === s.id ? 'Ocultar comentarios' : 'Ver comentarios' }}</button></article>
    } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando centros…' : 'No hay centros de este tipo.' }}</p> }</div>
    @if (sel(); as id) {
      <div class="tabla" style="margin-top:16px"><h2 style="font-size:20px">Comentarios y calificaciones</h2>
        @for (c of delSel(); track c.id) { <p><b>{{ c.autor }}</b> · {{ '★'.repeat(c.puntaje) }} · <small>{{ c.fecha }}</small><br>{{ c.texto }}</p> } @empty { <p>Aún no hay comentarios.</p> }
        @if (auth.usuario()) {
          <form [formGroup]="form" (ngSubmit)="comentar(id)" novalidate style="display:grid;gap:10px;max-width:520px;margin-top:12px">
            <label>Calificación<select formControlName="puntaje"><option value="5">5 · Excelente</option><option value="4">4 · Muy buena</option><option value="3">3 · Regular</option><option value="2">2 · Mala</option><option value="1">1 · Muy mala</option></select></label>
            <label>Tu comentario<input formControlName="texto" maxlength="300" [attr.aria-invalid]="intento() && form.invalid"></label>
            <p class="err" role="alert">@if (intento() && form.invalid) { Escribe entre 3 y 300 caracteres. }</p>
            <button class="btn brand" type="submit" [disabled]="cargando()">Publicar comentario</button></form>
        } @else { <p><a routerLink="/login" class="link">Inicia sesión</a> para comentar.</p> }</div> }</section>`,
})
export class Centros {
  protected readonly store = inject(CitasStore); protected readonly auth = inject(Auth); private readonly api = inject(CurarApi);
  protected readonly tipos = ['Todos', 'Hospitales', 'Policlínicos', 'Clínicas'];
  protected readonly tipo = signal('Todos'); protected readonly sel = signal('');
  protected readonly comentarios = signal<readonly Comentario[]>([]); protected readonly cargando = signal(false); protected readonly error = signal(''); protected readonly intento = signal(false);
  protected readonly sedes = computed(() => this.store.sedes().filter((s) => this.tipo() === 'Todos' || s.tipo === this.tipo()));
  protected readonly delSel = computed(() => this.comentarios().filter((c) => c.sedeId === this.sel()));
  protected readonly form = inject(FormBuilder).nonNullable.group({ puntaje: ['5'], texto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]] });
  constructor() { this.store.cargarSedes(); this.store.cargarMedicos(); ejecutar(this.api.comentarios(), this.cargando, this.error, (l) => this.comentarios.set(l)); }
  protected mapa(s: Sede): string { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.nombre} ${s.direccion}`)}`; }
  protected especialidades(id: string): string { const e = [...new Set(this.store.activos().filter((m) => m.sedeId === id).map((m) => m.especialidad))]; return e.length ? e.join(', ') : 'Por definir'; }
  protected promedio(id: string): string { const l = this.comentarios().filter((c) => c.sedeId === id); return l.length ? `★ ${(l.reduce((s, c) => s + c.puntaje, 0) / l.length).toFixed(1)} (${l.length} opiniones)` : 'Sin calificaciones'; }
  protected comentar(sedeId: string): void {
    this.intento.set(true); const u = this.auth.usuario();
    if (this.form.invalid || !u || this.cargando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    ejecutar(this.api.crearComentario({ sedeId, autor: u.nombre.split(' ')[0] ?? 'Paciente', texto: v.texto.trim(), puntaje: Number(v.puntaje), fecha: new Date().toISOString().slice(0, 10) }), this.cargando, this.error,
      (c) => { this.comentarios.update((l) => [c, ...l]); this.form.reset({ puntaje: '5', texto: '' }); this.intento.set(false); });
  }
}
