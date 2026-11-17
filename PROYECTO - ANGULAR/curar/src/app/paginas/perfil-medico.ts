import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { ValoracionPipe } from '../pipes/valoracion.pipe';
import { Auth } from '../servicios/auth';
@Component({
  selector: 'app-perfil-medico', imports: [RouterLink, DecimalPipe, ValoracionPipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px">
    @if (m(); as m) {
      <p style="margin-bottom:12px"><a routerLink="/medicos" class="link">← Volver a médicos</a></p>
      <div class="tabla" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
        @if (m.foto) {
          <img [src]="m.foto" [alt]="'Foto de ' + m.nombre" width="96" height="96" style="width:96px;height:96px;border-radius:50%;object-fit:cover;flex:none">
        } @else {
          <div class="avatar" style="width:96px;height:96px"></div>
        }
        <div>
          <h1 style="font-size:28px">{{ m.nombre }}</h1>
          <p>{{ m.especialidad }} · CMP {{ m.cmp ?? 's/n' }}</p>
          <p class="stars" [attr.aria-label]="'Calificación ' + m.calificacion + ' de 5'">★ {{ m.calificacion | number: '1.1-1' }} · {{ m.calificacion | valoracion }}</p>
        </div>
      </div>
      <div class="tabla"><h2 style="font-size:20px">Formación y experiencia</h2><p>{{ m.universidad ?? 'No registrada' }}</p><p>{{ m.experiencia ?? 'Sin información adicional.' }}</p></div>
      <div class="tabla"><h2 style="font-size:20px">Reconocimientos</h2>
        @for (r of m.reconocimientos ?? []; track r) { <p>★ {{ r }}</p> } @empty { <p>Aún no hay reconocimientos registrados.</p> }</div>
      <div class="tabla"><h2 style="font-size:20px">Sede y horario</h2><p>{{ sede() }}</p><p>Horario: {{ m.horario.join(' · ') }}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn brand" routerLink="/reservar" [queryParams]="{ medicoId: m.id }">Reservar con {{ m.nombre }}</a>
        @if (auth.usuario()) { <button class="btn ghost" type="button" [attr.aria-pressed]="esFav()" [disabled]="store.guardando()" (click)="alternar()">{{ esFav() ? '★ Quitar de favoritos' : '☆ Agregar a favoritos' }}</button> }
      </div>
    } @else { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando perfil…' : 'No encontramos a este médico.' }}</p> }
    <p class="err" role="alert">{{ store.error() }}</p></section>`,
})
export class PerfilMedico {
  protected readonly store = inject(CitasStore); protected readonly auth = inject(Auth);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly m = computed(() => this.store.medicos().find((x) => x.id === this.id));
  protected readonly sede = computed(() => this.store.sedes().find((s) => s.id === this.m()?.sedeId)?.nombre ?? 'Sede por asignar');
  protected readonly esFav = computed(() => this.store.favoritos().some((f) => f.medicoId === this.id));
  constructor() { this.store.cargarMedicos(); this.store.cargarSedes(); const u = this.auth.usuario(); if (u) this.store.cargarFavoritos(u.dni); }
  protected alternar(): void { const u = this.auth.usuario(); if (u) this.store.alternarFavorito(u.dni, this.id); }
}