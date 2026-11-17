import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import type { Reclamo, TipoReclamo } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
import { capitalizarNombre, PATRON_CORREO, PATRON_DNI, PATRON_NOMBRE, PATRON_TELEFONO } from '../utilidades/validacion';
type Campo = 'nombre' | 'dni' | 'correo' | 'telefono' | 'domicilio' | 'detalle' | 'pedido' | 'acepto';
@Component({
  selector: 'app-reclamaciones', imports: [ReactiveFormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Libro de Reclamaciones</h1>
    <p style="margin:6px 0 20px">Registra tu reclamo o queja sobre la atención recibida. Al enviarlo obtendrás un código de seguimiento.</p>
    @if (enviado(); as r) {
      <div class="tabla" role="status" style="max-width:640px">
        <h2 style="font-size:22px">Hoja de reclamación registrada</h2>
        <p style="margin:12px 0"><span class="pill">{{ r.codigo }}</span></p>
        <p><b>Tipo:</b> {{ r.tipo }} · <b>Fecha:</b> {{ r.fecha }}</p>
        <p style="margin-top:8px">La respuesta se dará al correo que indicaste ({{ r.correo }}). Guarda tu código.</p>
        <p style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" type="button" (click)="otro()">Registrar otro</button><a class="btn" routerLink="/">Volver al inicio</a></p>
      </div>
    } @else {
      <form class="tabla" [formGroup]="form" (ngSubmit)="enviar()" novalidate style="max-width:760px;display:grid;gap:14px">
        <h2 style="font-size:20px">1. Tipo de hoja</h2>
        <div role="group" aria-label="Tipo de hoja" style="display:flex;gap:8px;flex-wrap:wrap">
          @for (t of tipos; track t) { <button type="button" class="btn" [class.ghost]="tipo() !== t" [attr.aria-pressed]="tipo() === t" (click)="tipo.set(t)">{{ t }}</button> }</div>
        <p class="note" style="margin:0">@if (tipo() === 'Reclamo') { Reclamo: disconformidad con el servicio de salud recibido. } @else { Queja: malestar por la atención al público, sin relación directa con el servicio de salud. }</p>

        <h2 style="font-size:20px;margin-top:8px">2. Datos de quien reclama</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
          <label>Nombres y apellidos<input formControlName="nombre" autocomplete="name" [attr.aria-invalid]="malo('nombre')"></label>
          <label>DNI<input formControlName="dni" inputmode="numeric" maxlength="8" [attr.aria-invalid]="malo('dni')"></label>
          <label>Correo electrónico<input type="email" formControlName="correo" autocomplete="email" [attr.aria-invalid]="malo('correo')"></label>
          <label>Celular<input formControlName="telefono" inputmode="numeric" maxlength="9" placeholder="9XXXXXXXX" [attr.aria-invalid]="malo('telefono')"></label>
          <label style="grid-column:1/-1">Domicilio<input formControlName="domicilio" autocomplete="street-address" [attr.aria-invalid]="malo('domicilio')"></label>
        </div>

        <h2 style="font-size:20px;margin-top:8px">3. Servicio relacionado</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
          <label>Sede<select formControlName="sedeId"><option value="">No especificada</option>@for (s of store.sedes(); track s.id) { <option [value]="s.id">{{ s.nombre }}</option> }</select></label>
          <label>Servicio<select formControlName="servicio"><option>Consulta médica</option><option>Reserva de citas en línea</option><option>Admisión y atención administrativa</option><option>Farmacia</option><option>Otro</option></select></label>
        </div>

        <h2 style="font-size:20px;margin-top:8px">4. Detalle</h2>
        <label>Describe lo ocurrido (mínimo 20 caracteres)<textarea formControlName="detalle" rows="5" maxlength="1000" [attr.aria-invalid]="malo('detalle')"></textarea></label>
        <label>¿Qué solución esperas? (mínimo 10 caracteres)<textarea formControlName="pedido" rows="3" maxlength="500" [attr.aria-invalid]="malo('pedido')"></textarea></label>

        <label class="chk"><input type="checkbox" formControlName="acepto" [attr.aria-invalid]="malo('acepto')"><span>Declaro que los datos son verdaderos y autorizo su tratamiento para atender este caso, conforme a la Ley 29733.</span></label>
        <p class="note" style="margin:0">La formulación de un reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para presentar una denuncia ante el INDECOPI.</p>

        <p class="err" role="alert">@if (intento() && form.invalid) { Revisa los campos marcados en rojo: DNI de 8 dígitos, celular de 9 dígitos que empiece con 9, correo válido, detalle de al menos 20 caracteres y la declaración aceptada. } {{ error() }}</p>
        <button class="btn brand" type="submit" [disabled]="cargando()" style="justify-self:start">{{ cargando() ? 'Enviando…' : 'Enviar hoja de reclamación' }}</button>
      </form>
    }</section>`,
})
export class Reclamaciones {
  protected readonly store = inject(CitasStore); private readonly api = inject(CurarApi); private readonly auth = inject(Auth);
  protected readonly tipos: TipoReclamo[] = ['Reclamo', 'Queja'];
  protected readonly tipo = signal<TipoReclamo>('Reclamo');
  protected readonly cargando = signal(false); protected readonly error = signal(''); protected readonly intento = signal(false);
  protected readonly enviado = signal<Reclamo | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), Validators.pattern(PATRON_NOMBRE)]],
    dni: ['', [Validators.required, Validators.pattern(PATRON_DNI)]],
    correo: ['', [Validators.required, Validators.pattern(PATRON_CORREO)]],
    telefono: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]],
    domicilio: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    sedeId: [''], servicio: ['Consulta médica'],
    detalle: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
    pedido: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    acepto: [false, Validators.requiredTrue],
  });
  constructor() {
    this.store.cargarSedes();
    const u = this.auth.usuario(); if (u) this.form.patchValue({ nombre: u.nombre, dni: u.dni });
  }
  protected malo(c: Campo): boolean { const x = this.form.controls[c]; return x.invalid && (x.touched || this.intento()); }
  protected otro(): void { this.enviado.set(null); this.intento.set(false); this.form.reset({ sedeId: '', servicio: 'Consulta médica', acepto: false }); const u = this.auth.usuario(); if (u) this.form.patchValue({ nombre: u.nombre, dni: u.dni }); }
  protected enviar(): void {
    this.intento.set(true); this.error.set('');
    if (this.form.invalid || this.cargando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue(), sede = this.store.sedes().find((s) => s.id === v.sedeId)?.nombre ?? 'No especificada';
    const hoy = new Date(), codigo = `LR-${hoy.getFullYear()}-${String(Date.now()).slice(-6)}`;
    const r: Reclamo = { codigo, tipo: this.tipo(), nombre: capitalizarNombre(v.nombre), dni: v.dni, correo: v.correo.trim().toLowerCase(), telefono: v.telefono, domicilio: v.domicilio.trim(), sede, servicio: v.servicio, detalle: v.detalle.trim(), pedido: v.pedido.trim(), fecha: hoy.toLocaleDateString('sv-SE'), estado: 'Recibido' };
    ejecutar(this.api.crearReclamo(r), this.cargando, this.error, (n) => this.enviado.set(n));
  }
}