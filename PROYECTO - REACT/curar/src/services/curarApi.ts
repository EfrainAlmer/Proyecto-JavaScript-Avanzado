import { z } from 'zod';
import type { BorradorCita, Comentario, EstadoCita, Familiar, Favorito, Informe, Medico, Mensaje, Receta, Reclamo, UsuarioApi } from '../types/cita';
import {
  API, citaSchema, comentarioSchema, decodificar, familiarSchema, favoritoSchema, informeSchema, medicoSchema, mensajeSchema,
  recetaSchema, reclamoSchema, sedeSchema, usuarioSchema,
} from './contract';
import { http } from './http';

const enc = encodeURIComponent;

/** GET de una colección validada con el contrato. `senal` permite cancelar (TanStack Query la entrega). */
const obtener = async <T,>(ruta: string, esquema: z.ZodType<T>, senal?: AbortSignal): Promise<T[]> =>
  decodificar(z.array(esquema), await http('GET', `${API}/${ruta}`, undefined, senal));

/** Filtrado en el cliente: json-server no compara siempre bien textos numéricos. */
const lista = async <T,>(ruta: string, esquema: z.ZodType<T>, filtro: (x: T) => boolean, senal?: AbortSignal): Promise<T[]> =>
  (await obtener(ruta, esquema, senal)).filter(filtro);

/** Escritura con respuesta validada. */
const enviar = async <T,>(metodo: 'POST' | 'PUT' | 'PATCH', url: string, cuerpo: unknown, esquema: z.ZodType<T>): Promise<T> =>
  decodificar(esquema, await http(metodo, url, cuerpo));

/** DELETE: la respuesta no se usa, así que no se valida. */
const borrar = async (url: string): Promise<void> => {
  await http('DELETE', url);
};

export const curarApi = {
  medicos: (senal?: AbortSignal) => obtener('medicos', medicoSchema, senal),
  medico: async (id: string, senal?: AbortSignal) => decodificar(medicoSchema, await http('GET', `${API}/medicos/${enc(id)}`, undefined, senal)),
  altaMedico: (m: Medico) => enviar('POST', `${API}/medicos`, m, medicoSchema),
  guardarMedico: (m: Medico) => enviar('PUT', `${API}/medicos/${enc(m.id)}`, m, medicoSchema),
  eliminarMedico: (id: string) => borrar(`${API}/medicos/${enc(id)}`),

  usuarios: (dni: string, senal?: AbortSignal) => lista('usuarios', usuarioSchema, (u) => u.dni.trim() === dni.trim(), senal),
  todosUsuarios: (senal?: AbortSignal) => obtener('usuarios', usuarioSchema, senal),
  registrar: (u: UsuarioApi) => enviar('POST', `${API}/usuarios`, u, usuarioSchema),
  actualizarUsuario: (id: string, cambios: Partial<UsuarioApi>) => enviar('PATCH', `${API}/usuarios/${enc(id)}`, cambios, usuarioSchema),
  async correoUsado(correo: string, dni: string): Promise<boolean> {
    const todos = await obtener('usuarios', usuarioSchema);
    return todos.some((u) => u.correo === correo && u.dni !== dni);
  },

  citas: (dni: string, senal?: AbortSignal) => lista('citas', citaSchema, (c) => c.dniPaciente === dni, senal),
  citasDeMedico: (id: string, senal?: AbortSignal) => lista('citas', citaSchema, (c) => c.medicoId === id, senal),
  todasCitas: (senal?: AbortSignal) => obtener('citas', citaSchema, senal),
  cita: async (id: string, senal?: AbortSignal) => decodificar(citaSchema, await http('GET', `${API}/citas/${enc(id)}`, undefined, senal)),
  async ocupadas(id: string, fecha: string, senal?: AbortSignal): Promise<string[]> {
    const citas = await curarApi.citasDeMedico(id, senal);
    return citas.filter((c) => c.fecha === fecha && c.estado !== 'Cancelada').map((c) => c.hora);
  },
  crear: (b: BorradorCita) => enviar('POST', `${API}/citas`, { ...b, estado: 'Pendiente' }, citaSchema),
  cambiarEstado: (id: string, estado: EstadoCita) => enviar('PATCH', `${API}/citas/${enc(id)}`, { estado }, citaSchema),
  cancelar: (id: string) => curarApi.cambiarEstado(id, 'Cancelada'),
  eliminar: (id: string) => borrar(`${API}/citas/${enc(id)}`),

  informes: (dni: string, senal?: AbortSignal) => lista('informes', informeSchema, (i) => i.dniPaciente === dni, senal),
  informesDeMedico: (id: string, senal?: AbortSignal) => lista('informes', informeSchema, (i) => i.medicoId === id, senal),
  crearInforme: (i: Informe) => enviar('POST', `${API}/informes`, i, informeSchema),

  recetas: (dni: string, senal?: AbortSignal) => lista('recetas', recetaSchema, (r) => r.dniPaciente === dni, senal),
  crearReceta: (r: Receta) => enviar('POST', `${API}/recetas`, r, recetaSchema),

  mensajes: (dni: string, senal?: AbortSignal) => lista('mensajes', mensajeSchema, (m) => m.dni === dni, senal),
  crearMensaje: (m: Mensaje) => enviar('POST', `${API}/mensajes`, m, mensajeSchema),

  favoritos: (dni: string, senal?: AbortSignal) => lista('favoritos', favoritoSchema, (f) => f.dni === dni, senal),
  agregarFavorito: (f: Favorito) => enviar('POST', `${API}/favoritos`, f, favoritoSchema),
  quitarFavorito: (id: string) => borrar(`${API}/favoritos/${enc(id)}`),

  sedes: (senal?: AbortSignal) => obtener('sedes', sedeSchema, senal),

  familiares: (dni: string, senal?: AbortSignal) => lista('familiares', familiarSchema, (f) => f.dniTitular === dni, senal),
  agregarFamiliar: (f: Familiar) => enviar('POST', `${API}/familiares`, f, familiarSchema),
  quitarFamiliar: (id: string) => borrar(`${API}/familiares/${enc(id)}`),

  comentarios: (senal?: AbortSignal) => obtener('comentarios', comentarioSchema, senal),
  crearComentario: (c: Comentario) => enviar('POST', `${API}/comentarios`, c, comentarioSchema),

  reclamos: (senal?: AbortSignal) => obtener('reclamos', reclamoSchema, senal),
  crearReclamo: (r: Reclamo) => enviar('POST', `${API}/reclamos`, r, reclamoSchema),
  actualizarReclamo: (id: string, cambios: Partial<Reclamo>) => enviar('PATCH', `${API}/reclamos/${enc(id)}`, cambios, reclamoSchema),
};
