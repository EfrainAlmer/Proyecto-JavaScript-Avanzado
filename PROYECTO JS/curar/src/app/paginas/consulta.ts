import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators, type AbstractControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, of, switchMap, tap, type Observable } from 'rxjs';
import type { Cita, Informe, Receta } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
import { mensajeHttp } from '../servicios/mensaje-http';

const filaReceta = (fb: NonNullableFormBuilder) => fb.group({
  medicamento: ['', [Validators.required, Validators.minLength(3)]],
  cantidad: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
  indicaciones: ['', [Validators.required, Validators.minLength(5)]],
});

@Component({
  selector: 'app-consulta', imports: [ReactiveFormsModule, RouterLink, DatePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:32px 20px 48px">
    <div class="co-top"><a class="btn ghost sm co-pill" routerLink="/panel-medico"><i class="bi bi-arrow-left" aria-hidden="true"></i> Volver al panel</a><span class="co-chip">Atención médica</span></div>

    @if (cita(); as c) {
      @if (listo()) {
        <div class="co-ok" role="status">
          <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
          <h1>Atención registrada</h1>
          <p>El informe de {{ c.paciente ?? 'el paciente' }} quedó guardado y la cita figura como atendida.@if (nRecetas() > 0) { Se emitió {{ nRecetas() }} {{ nRecetas() === 1 ? 'receta' : 'recetas' }}. }</p>
          <div class="co-acc"><a class="btn co-pill" routerLink="/panel-medico">Volver al panel</a></div>
        </div>
      } @else if (c.estado === 'Atendida' || c.estado === 'Cancelada') {
        <p class="tabla" role="status">Esta cita ya está {{ c.estado === 'Atendida' ? 'atendida' : 'cancelada' }}, por lo que no se puede iniciar una atención.</p>
      } @else {
        <article class="co-pac">
          <span class="co-badge">PACIENTE EN ATENCIÓN</span>
          <h1>{{ c.paciente ?? 'Paciente' }}</h1>
          <p class="co-id">DNI: {{ c.dniPaciente }} | {{ c.seguro }}</p>
          <div class="co-datos">
            <p><i class="bi bi-clock" aria-hidden="true"></i> {{ c.fecha | date: 'EEEE d MMMM' }} · {{ hora12(c.hora) }}</p>
            <p><i class="bi bi-chat-left-text" aria-hidden="true"></i> Motivo de la cita: {{ c.motivo ?? 'No indicado' }}</p>
          </div>
        </article>

        <form [formGroup]="form" (ngSubmit)="finalizar()" novalidate>
          <section class="co-sec" aria-labelledby="t-vitales">
            <h2 id="t-vitales"><i class="bi bi-heart-pulse" aria-hidden="true"></i> Signos vitales <small>(opcional)</small></h2>
            <div class="co-grid">
              <label>Presión arterial (mmHg)<input formControlName="presion" placeholder="120/80" inputmode="numeric" [attr.aria-invalid]="malo(form.controls.presion)"></label>
              <label>Frecuencia cardíaca (lpm)<input type="number" formControlName="frecuencia" placeholder="72" min="30" max="220" [attr.aria-invalid]="malo(form.controls.frecuencia)"></label>
            </div>
            @if (malo(form.controls.presion) || malo(form.controls.frecuencia)) { <p class="err" role="alert">Presión con formato 120/80 y frecuencia entre 30 y 220.</p> }
          </section>

          <section class="co-sec" aria-labelledby="t-informe">
            <h2 id="t-informe"><i class="bi bi-journal-medical" aria-hidden="true"></i> Informe de atención</h2>
            <label>Síntomas y motivo de consulta<textarea rows="3" formControlName="sintomas" [attr.aria-invalid]="malo(form.controls.sintomas)"></textarea></label>
            <label>Hallazgos del examen<textarea rows="3" formControlName="hallazgos" placeholder="Qué encontró en la evaluación" [attr.aria-invalid]="malo(form.controls.hallazgos)"></textarea></label>
            <label>Diagnóstico<input formControlName="diagnostico" placeholder="Ej. Cefalea tensional" [attr.aria-invalid]="malo(form.controls.diagnostico)"></label>
            <label>Plan e indicaciones<textarea rows="3" formControlName="plan" placeholder="Tratamiento, controles, recomendaciones" [attr.aria-invalid]="malo(form.controls.plan)"></textarea></label>
          </section>

          <section class="co-sec" aria-labelledby="t-receta">
            <h2 id="t-receta"><i class="bi bi-prescription2" aria-hidden="true"></i> Receta médica <small>(opcional)</small></h2>
            <div formArrayName="recetas">
              @for (g of recetas.controls; track g; let i = $index) {
                <div class="co-med" [formGroupName]="i">
                  <label>Medicamento<input formControlName="medicamento" placeholder="Ej. Paracetamol 500 mg" [attr.aria-invalid]="malo(g.controls.medicamento)"></label>
                  <label>Cantidad (envases)<input type="number" formControlName="cantidad" min="1" max="99" [attr.aria-invalid]="malo(g.controls.cantidad)"></label>
                  <label class="co-ind">Indicaciones<input formControlName="indicaciones" placeholder="Ej. Una tableta cada 8 horas por 3 días" [attr.aria-invalid]="malo(g.controls.indicaciones)"></label>
                  <button type="button" class="btn ghost co-quitar" [attr.aria-label]="'Quitar medicamento ' + (i + 1)" (click)="quitar(i)"><i class="bi bi-trash" aria-hidden="true"></i> Quitar</button>
                </div>
              } @empty { <p class="co-vacio">Sin medicamentos. Agrega uno si el paciente necesita receta.</p> }
            </div>
            <button type="button" class="btn ghost co-pill" (click)="agregar()"><i class="bi bi-plus-lg" aria-hidden="true"></i> Agregar medicamento</button>
          </section>

          <p class="err" role="alert">@if (intento() && form.invalid) { Completa los campos marcados: síntomas (3+ letras), hallazgos (5+), diagnóstico (3+), plan (5+) y los datos de cada medicamento. }</p>
          <p class="err" role="alert">{{ error() }}</p>

          <div class="co-barra">
            <a class="btn ghost co-pill" routerLink="/panel-medico">Cancelar</a>
            <button class="btn co-pill co-final" type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Finalizar atención' }}</button>
          </div>
        </form>
      }
    } @else { <p class="tabla" role="status">{{ cargando() ? 'Cargando cita…' : (ajena() ? 'Esta cita no pertenece a tu agenda.' : (error() || 'No encontramos la cita.')) }}</p> }
  </section>`,
  styles: `
    .co-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    .co-pill { border-radius: 999px; padding-inline: 24px; }
    .co-chip { font-size: 13px; font-weight: 600; background: var(--card); border: 1px solid var(--line); padding: 4px 12px; border-radius: 6px; }
    .co-pac { background: var(--navy); color: #fff; border-radius: var(--r-lg); padding: 28px; display: grid; gap: 10px; margin-bottom: 20px; box-shadow: 0 16px 40px rgb(0 11 51 / .2); }
    .co-badge { justify-self: start; background: #FACC15; color: #1F2937; font-size: 12px; font-weight: 800; letter-spacing: .04em; padding: 5px 14px; border-radius: 999px; }
    .co-pac h1 { color: #fff; font-size: clamp(24px, 3vw, 32px); margin: 0; }
    .co-id { color: #AEB9D6; margin: 0; }
    .co-datos { border-top: 1px solid rgb(255 255 255 / .14); padding-top: 12px; display: grid; gap: 6px; }
    .co-datos p { margin: 0; display: flex; align-items: center; gap: 10px; text-transform: none; }
    .co-datos i { color: #7DD3FC; }
    .co-sec { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 24px; margin-bottom: 16px; display: grid; gap: 14px; box-shadow: 0 8px 24px rgb(119 148 208 / .1); }
    .co-sec h2 { font-size: 20px; margin: 0; display: flex; align-items: center; gap: 10px; }
    .co-sec h2 small { font-size: 13px; font-weight: 500; color: var(--slate-text); }
    .co-sec label { font-size: 14px; color: var(--navy); }
    .co-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 560px) { .co-grid { grid-template-columns: 1fr; } }
    input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: #B3261E; }
    .co-med { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: var(--r-md); background: #F8FAFE; margin-bottom: 12px; }
    .co-med .co-ind { grid-column: 1 / -1; }
    .co-quitar { justify-self: start; grid-column: 1 / -1; border-color: #E5A3A0; color: #B3261E; border-radius: 999px; min-height: 40px; padding: 8px 16px; }
    @media (max-width: 560px) { .co-med { grid-template-columns: 1fr; } }
    .co-vacio { color: var(--slate-text); margin: 0 0 12px; }
    .co-barra { position: sticky; bottom: 0; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 0; background: linear-gradient(to top, #fff 70%, transparent); }
    .co-final { background: #198754; margin-left: auto; }
    .co-ok { text-align: center; display: grid; justify-items: center; gap: 10px; padding: 32px 0; }
    .co-ok > i { font-size: 56px; color: #198754; }
    .co-acc { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 12px; }
  `,
})
export class Consulta {
  private readonly api = inject(CurarApi); private readonly auth = inject(Auth);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly cita = signal<Cita | null>(null);
  protected readonly cargando = signal(false); protected readonly guardando = signal(false); protected readonly error = signal('');
  protected readonly intento = signal(false); protected readonly listo = signal(false); protected readonly ajena = signal(false); protected readonly nRecetas = signal(0);
  private informeGuardado = false; private recetasGuardadas = false; // evita duplicar si hay que reintentar tras un fallo
  protected readonly form = this.fb.group({
    presion: ['', [Validators.pattern(/^\d{2,3}\/\d{2,3}$/)]],
    frecuencia: [null as number | null, [Validators.min(30), Validators.max(220)]],
    sintomas: ['', [Validators.required, Validators.minLength(3)]],
    hallazgos: ['', [Validators.required, Validators.minLength(5)]],
    diagnostico: ['', [Validators.required, Validators.minLength(3)]],
    plan: ['', [Validators.required, Validators.minLength(5)]],
    recetas: this.fb.array<ReturnType<typeof filaReceta>>([]),
  });
  protected readonly recetas = this.form.controls.recetas;
  constructor() {
    ejecutar(this.api.cita(this.id), this.cargando, this.error, (c) => {
      if (c.medicoId !== this.auth.usuario()?.medicoId) { this.ajena.set(true); return; }
      this.cita.set(c); this.form.controls.sintomas.setValue(c.motivo ?? '');
    });
  }
  protected hora12(h: string): string { const [hh = '0', mm = '00'] = h.split(':'); const n = Number(hh); return `${n % 12 || 12}:${mm} ${n < 12 ? 'AM' : 'PM'}`; }
  protected malo(c: AbstractControl): boolean { return c.invalid && (c.touched || this.intento()); }
  protected agregar(): void { this.recetas.push(filaReceta(this.fb)); }
  protected quitar(i: number): void { this.recetas.removeAt(i); }
  protected finalizar(): void {
    this.intento.set(true);
    const c = this.cita(), u = this.auth.usuario();
    if (!c || !u || this.guardando()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue(), fecha = new Date().toLocaleDateString('sv-SE'), paciente = c.paciente ?? '';
    const informe: Informe = {
      citaId: c.id, dniPaciente: c.dniPaciente, paciente, medicoId: c.medicoId, medicoNombre: u.nombre, fecha,
      ...(v.presion.trim() ? { presion: v.presion.trim() } : {}), ...(v.frecuencia !== null ? { frecuencia: v.frecuencia } : {}),
      sintomas: v.sintomas.trim(), hallazgos: v.hallazgos.trim(), diagnostico: v.diagnostico.trim(), plan: v.plan.trim(),
    };
    const recetas: Receta[] = v.recetas.map((r) => ({ citaId: c.id, dniPaciente: c.dniPaciente, paciente, medicoId: c.medicoId, medicoNombre: u.nombre, fecha, medicamento: r.medicamento.trim(), cantidad: r.cantidad, indicaciones: r.indicaciones.trim() }));
    this.guardando.set(true); this.error.set('');
    // Tipos explícitos: mezclar Observable<Informe> con Observable<null> impide que TypeScript infiera pipe().
    const informe$: Observable<unknown> = this.informeGuardado ? of(null) : this.api.crearInforme(informe).pipe(tap(() => { this.informeGuardado = true; }));
    const recetas$: Observable<unknown> = this.recetasGuardadas || !recetas.length ? of(null) : forkJoin(recetas.map((r) => this.api.crearReceta(r))).pipe(tap(() => { this.recetasGuardadas = true; }));
    informe$.pipe(
      switchMap(() => recetas$),
      switchMap(() => this.api.cambiarEstado(c.id, 'Atendida')),
      finalize(() => this.guardando.set(false)),
    ).subscribe({
      next: () => { this.nRecetas.set(recetas.length); this.listo.set(true); window.scrollTo(0, 0); },
      error: (e) => this.error.set(mensajeHttp(e)),
    });
  }
}