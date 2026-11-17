import type {
  BorradorCita, Cita, Comentario, EstadoCita, Familiar, Favorito, Informe, Medico, Mensaje, Receta, Reclamo, Sede, UsuarioApi,
} from '../types/cita';
import { http } from './http';

export const API = 'http://127.0.0.1:3000';

const enc = encodeURIComponent;

// Filtrado en el cliente: json-server no compara siempre bien textos numéricos.
async function lista<T>(ruta: string, filtro: (x: T) => boolean): Promise<T[]> {
  const todos = await http<T[]>('GET', `${API}/${ruta}`);
  return todos.filter(filtro);
}

export const curarApi = {
  medicos: () => http<Medico[]>('GET', `${API}/medicos`),
  altaMedico: (m: Medico) => http<Medico>('POST', `${API}/medicos`, m),
  guardarMedico: (m: Medico) => http<Medico>('PUT', `${API}/medicos/${enc(m.id)}`, m),
  eliminarMedico: (id: string) => http<unknown>('DELETE', `${API}/medicos/${enc(id)}`),

  usuarios: (dni: string) => lista<UsuarioApi>('usuarios', (u) => String(u.dni).trim() === dni.trim()),
  todosUsuarios: () => http<UsuarioApi[]>('GET', `${API}/usuarios`),
  registrar: (u: UsuarioApi) => http<UsuarioApi>('POST', `${API}/usuarios`, u),
  actualizarUsuario: (id: string, cambios: Partial<UsuarioApi>) => http<UsuarioApi>('PATCH', `${API}/usuarios/${enc(id)}`, cambios),
  async correoUsado(correo: string, dni: string): Promise<boolean> {
    const todos = await http<UsuarioApi[]>('GET', `${API}/usuarios`);
    return todos.some((u) => u.correo === correo && String(u.dni) !== dni);
  },

  citas: (dni: string) => lista<Cita>('citas', (c) => String(c.dniPaciente) === dni),
  citasDeMedico: (id: string) => lista<Cita>('citas', (c) => c.medicoId === id),
  todasCitas: () => http<Cita[]>('GET', `${API}/citas`),
  cita: (id: string) => http<Cita>('GET', `${API}/citas/${enc(id)}`),
  async ocupadas(id: string, fecha: string): Promise<string[]> {
    const citas = await curarApi.citasDeMedico(id);
    return citas.filter((c) => c.fecha === fecha && c.estado !== 'Cancelada').map((c) => c.hora);
  },
  crear: (b: BorradorCita) => http<Cita>('POST', `${API}/citas`, { ...b, estado: 'Pendiente' }),
  cambiarEstado: (id: string, estado: EstadoCita) => http<Cita>('PATCH', `${API}/citas/${enc(id)}`, { estado }),
  cancelar: (id: string) => curarApi.cambiarEstado(id, 'Cancelada'),
  eliminar: (id: string) => http<unknown>('DELETE', `${API}/citas/${enc(id)}`),

  informes: (dni: string) => lista<Informe>('informes', (i) => String(i.dniPaciente) === dni),
  informesDeMedico: (id: string) => lista<Informe>('informes', (i) => i.medicoId === id),
  crearInforme: (i: Informe) => http<Informe>('POST', `${API}/informes`, i),

  recetas: (dni: string) => lista<Receta>('recetas', (r) => String(r.dniPaciente) === dni),
  crearReceta: (r: Receta) => http<Receta>('POST', `${API}/recetas`, r),

  mensajes: (dni: string) => lista<Mensaje>('mensajes', (m) => String(m.dni) === dni),
  crearMensaje: (m: Mensaje) => http<Mensaje>('POST', `${API}/mensajes`, m),

  favoritos: (dni: string) => lista<Favorito>('favoritos', (f) => String(f.dni) === dni),
  agregarFavorito: (f: Favorito) => http<Favorito>('POST', `${API}/favoritos`, f),
  quitarFavorito: (id: string) => http<unknown>('DELETE', `${API}/favoritos/${enc(id)}`),

  sedes: () => http<Sede[]>('GET', `${API}/sedes`),

  familiares: (dni: string) => lista<Familiar>('familiares', (f) => String(f.dniTitular) === dni),
  agregarFamiliar: (f: Familiar) => http<Familiar>('POST', `${API}/familiares`, f),
  quitarFamiliar: (id: string) => http<unknown>('DELETE', `${API}/familiares/${enc(id)}`),

  comentarios: () => http<Comentario[]>('GET', `${API}/comentarios`),
  crearComentario: (c: Comentario) => http<Comentario>('POST', `${API}/comentarios`, c),

  reclamos: () => http<Reclamo[]>('GET', `${API}/reclamos`),
  crearReclamo: (r: Reclamo) => http<Reclamo>('POST', `${API}/reclamos`, r),
  actualizarReclamo: (id: string, cambios: Partial<Reclamo>) => http<Reclamo>('PATCH', `${API}/reclamos/${enc(id)}`, cambios),
};
