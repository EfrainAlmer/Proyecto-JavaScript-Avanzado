import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { BorradorCita, Cita, EstadoCita, Favorito, Medico, Mensaje, Receta, Sede, Familiar, Comentario, Reclamo, Informe } from '../modelos/cita';
export const API = 'http://127.0.0.1:3000';
export interface UsuarioApi { id?: string; dni: string; nombre: string; correo?: string; telefono?: string; rol: number; password: string; medicoId?: string; cmp?: string; verificado?: boolean; creadoEn?: string; seguro?: string }
@Injectable({ providedIn: 'root' })
export class CurarApi {
  private readonly http = inject(HttpClient);
  // Filtrado en el cliente: json-server no compara siempre bien textos numéricos.
  private lista<T>(ruta: string, f: (x: T) => boolean): Observable<T[]> { return this.http.get<T[]>(`${API}/${ruta}`).pipe(map((l) => l.filter(f))); }
  medicos(): Observable<Medico[]> { return this.http.get<Medico[]>(`${API}/medicos`); }
  altaMedico(m: Medico): Observable<Medico> { return this.http.post<Medico>(`${API}/medicos`, m); }
  usuarios(dni: string): Observable<UsuarioApi[]> { return this.lista<UsuarioApi>('usuarios', (u) => String(u.dni).trim() === dni.trim()); }
  registrar(u: UsuarioApi): Observable<UsuarioApi> { return this.http.post<UsuarioApi>(`${API}/usuarios`, u); }
  citas(dni: string): Observable<Cita[]> { return this.lista<Cita>('citas', (c) => String(c.dniPaciente) === dni); }
  citasDeMedico(id: string): Observable<Cita[]> { return this.lista<Cita>('citas', (c) => c.medicoId === id); }
  ocupadas(id: string, fecha: string): Observable<string[]> { return this.citasDeMedico(id).pipe(map((l) => l.filter((c) => c.fecha === fecha && c.estado !== 'Cancelada').map((c) => c.hora))); }
  crear(b: BorradorCita): Observable<Cita> { return this.http.post<Cita>(`${API}/citas`, { ...b, estado: 'Pendiente' }); }
  cambiarEstado(id: string, estado: EstadoCita): Observable<Cita> { return this.http.patch<Cita>(`${API}/citas/${encodeURIComponent(id)}`, { estado }); }
  cancelar(id: string): Observable<Cita> { return this.cambiarEstado(id, 'Cancelada'); }
  eliminar(id: string): Observable<unknown> { return this.http.delete(`${API}/citas/${encodeURIComponent(id)}`); }
  cita(id: string): Observable<Cita> { return this.http.get<Cita>(`${API}/citas/${encodeURIComponent(id)}`); }
  informes(dni: string): Observable<Informe[]> { return this.lista<Informe>('informes', (i) => String(i.dniPaciente) === dni); }
  informesDeMedico(id: string): Observable<Informe[]> { return this.lista<Informe>('informes', (i) => i.medicoId === id); }
  crearInforme(i: Informe): Observable<Informe> { return this.http.post<Informe>(`${API}/informes`, i); }
  recetas(dni: string): Observable<Receta[]> { return this.lista<Receta>('recetas', (r) => String(r.dniPaciente) === dni); }
  crearReceta(r: Receta): Observable<Receta> { return this.http.post<Receta>(`${API}/recetas`, r); }
  mensajes(dni: string): Observable<Mensaje[]> { return this.lista<Mensaje>('mensajes', (m) => String(m.dni) === dni); }
  crearMensaje(m: Mensaje): Observable<Mensaje> { return this.http.post<Mensaje>(`${API}/mensajes`, m); }
  favoritos(dni: string): Observable<Favorito[]> { return this.lista<Favorito>('favoritos', (f) => String(f.dni) === dni); }
  agregarFavorito(f: Favorito): Observable<Favorito> { return this.http.post<Favorito>(`${API}/favoritos`, f); }
  quitarFavorito(id: string): Observable<unknown> { return this.http.delete(`${API}/favoritos/${encodeURIComponent(id)}`); }
  sedes(): Observable<Sede[]> { return this.http.get<Sede[]>(`${API}/sedes`); }
  todasCitas(): Observable<Cita[]> { return this.http.get<Cita[]>(`${API}/citas`); }
  todosUsuarios(): Observable<UsuarioApi[]> { return this.http.get<UsuarioApi[]>(`${API}/usuarios`); }
  correoUsado(correo: string, dni: string): Observable<boolean> { return this.todosUsuarios().pipe(map((l) => l.some((u) => u.correo === correo && String(u.dni) !== dni))); }
  actualizarUsuario(id: string, c: Partial<UsuarioApi>): Observable<UsuarioApi> { return this.http.patch<UsuarioApi>(`${API}/usuarios/${encodeURIComponent(id)}`, c); }
  guardarMedico(m: Medico): Observable<Medico> { return this.http.put<Medico>(`${API}/medicos/${encodeURIComponent(m.id)}`, m); }
  eliminarMedico(id: string): Observable<unknown> { return this.http.delete(`${API}/medicos/${encodeURIComponent(id)}`); }
  familiares(dni: string): Observable<Familiar[]> { return this.lista<Familiar>('familiares', (f) => String(f.dniTitular) === dni); }
  agregarFamiliar(f: Familiar): Observable<Familiar> { return this.http.post<Familiar>(`${API}/familiares`, f); }
  quitarFamiliar(id: string): Observable<unknown> { return this.http.delete(`${API}/familiares/${encodeURIComponent(id)}`); }
  comentarios(): Observable<Comentario[]> { return this.http.get<Comentario[]>(`${API}/comentarios`); }
  crearComentario(c: Comentario): Observable<Comentario> { return this.http.post<Comentario>(`${API}/comentarios`, c); }
  reclamos(): Observable<Reclamo[]> { return this.http.get<Reclamo[]>(`${API}/reclamos`); }
  crearReclamo(r: Reclamo): Observable<Reclamo> { return this.http.post<Reclamo>(`${API}/reclamos`, r); }
    actualizarReclamo(id: string, c: Partial<Reclamo>): Observable<Reclamo> { return this.http.patch<Reclamo>(`${API}/reclamos/${encodeURIComponent(id)}`, c); }
}
