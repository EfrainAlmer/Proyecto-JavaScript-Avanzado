import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Mensaje } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
type Filtro = 'Todos' | 'Enviado' | 'Recibido';
@Component({
  selector: 'app-mensajes', imports: [ReactiveFormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Mensajes</h1>
    <label style="max-width:420px">Buscar<input type="search" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" placeholder="Buscar mensaje"></label>
    <div role="group" aria-label="Filtrar mensajes" style="display:flex;gap:8px;margin:14px 0">
      @for (f of filtros; track f) { <button type="button" class="btn" [class.ghost]="filtro() !== f" [attr.aria-pressed]="filtro() === f" (click)="filtro.set(f)">{{ f === 'Todos' ? 'Todos' : f + 's' }}</button> }</div>
    <p class="err" role="alert">{{ error() }}</p>
    @for (m of visibles(); track m.id) { <article class="tabla"><b>{{ m.centro }}</b> <span class="pill">{{ m.tipo }}</span> <small>{{ m.fecha }}</small><br>{{ m.texto }}</article>
    } @empty { @if (!cargando()) { <p class="tabla" role="status">No hay mensajes en esta vista.</p> } }
    <form class="tabla" [formGroup]="form" (ngSubmit)="enviar()" novalidate style="display:grid;gap:10px;max-width:560px">
      <h2 style="font-size:20px">Escribir a un centro</h2>
      <label>Centro<select formControlName="centro"><option>Policlínico Pincos – Surco</option><option>Policlínico Santa Cruz</option></select></label>
      <label>Mensaje<input formControlName="texto" maxlength="300" [attr.aria-invalid]="intento() && form.invalid"></label>
      <p class="err" role="alert">@if (intento() && form.invalid) { Escribe entre 3 y 300 caracteres. }</p>
      <button class="btn brand" type="submit" [disabled]="cargando()">Enviar</button></form></section>`,
})
export class Mensajes {
  private readonly api = inject(CurarApi); private readonly auth = inject(Auth);
  protected readonly filtros: Filtro[] = ['Todos', 'Enviado', 'Recibido'];
  protected readonly lista = signal<readonly Mensaje[]>([]); protected readonly filtro = signal<Filtro>('Todos'); protected readonly busqueda = signal('');
  protected readonly cargando = signal(false); protected readonly error = signal(''); protected readonly intento = signal(false);
  protected readonly visibles = computed(() => { const q = this.busqueda().trim().toLocaleLowerCase('es-PE');
    return this.lista().filter((m) => (this.filtro() === 'Todos' || m.tipo === this.filtro()) && (!q || `${m.centro} ${m.texto}`.toLocaleLowerCase('es-PE').includes(q))); });
  protected readonly form = inject(FormBuilder).nonNullable.group({ centro: ['Policlínico Pincos – Surco'], texto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]] });
  constructor() { const u = this.auth.usuario(); if (u) ejecutar(this.api.mensajes(u.dni), this.cargando, this.error, (l) => this.lista.set(l)); }
  protected enviar(): void {
    this.intento.set(true); const u = this.auth.usuario();
    if (this.form.invalid || !u || this.cargando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    ejecutar(this.api.crearMensaje({ dni: u.dni, centro: v.centro, texto: v.texto.trim(), tipo: 'Enviado', fecha: new Date().toISOString().slice(0, 10) }), this.cargando, this.error,
      (m) => { this.lista.update((l) => [m, ...l]); this.form.reset(); this.intento.set(false); });
  }
}
