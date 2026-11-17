export type Seguro = 'EsSalud' | 'SIS';
export type EstadoCita = 'Pendiente' | 'Confirmada' | 'Atendida' | 'Cancelada';
export interface Medico { readonly id: string; readonly nombre: string; readonly especialidad: string; readonly calificacion: number; readonly centro: string; readonly horario: readonly string[]; readonly sedeId?: string; readonly cmp?: string; readonly estado?: 'Activo' | 'Inactivo'; readonly universidad?: string; readonly experiencia?: string; readonly reconocimientos?: readonly string[]; readonly foto?: string }
export interface Cita { readonly id: string; readonly dniPaciente: string; readonly medicoId: string; readonly seguro: Seguro; readonly fecha: string; readonly hora: string; readonly estado: EstadoCita; readonly motivo?: string; readonly paciente?: string; readonly familiarId?: string }
export type BorradorCita = Omit<Cita, 'id' | 'estado'>;
export interface Sesion { readonly dni: string; readonly nombre: string; readonly rol: number; readonly medicoId?: string }
// Roles y permisos por bits (guía de autenticación)
export const ROLE_PACIENTE = 1 << 0, ROLE_MEDICO = 1 << 1, ROLE_ADMIN = 1 << 2;
export const PERM_RESERVAR = 1 << 0, PERM_RECETAR = 1 << 1, PERM_GESTIONAR = 1 << 2;
export const PERMISOS: Readonly<Record<number, number>> = Object.freeze({
  [ROLE_PACIENTE]: PERM_RESERVAR, [ROLE_MEDICO]: PERM_RECETAR, [ROLE_ADMIN]: PERM_RESERVAR | PERM_RECETAR | PERM_GESTIONAR });
export const tienePermiso = (rol: number, p: number): boolean => ((PERMISOS[rol] ?? 0) & p) !== 0;
export interface Receta { readonly id?: string; readonly citaId?: string; readonly dniPaciente: string; readonly paciente?: string; readonly medicoId: string; readonly medicoNombre: string; readonly fecha: string; readonly medicamento: string; readonly cantidad: number; readonly indicaciones: string }
export interface Mensaje { readonly id?: string; readonly dni: string; readonly centro: string; readonly texto: string; readonly tipo: 'Enviado' | 'Recibido'; readonly fecha: string }
export interface Favorito { readonly id?: string; readonly dni: string; readonly medicoId: string }
export interface Sede { readonly id: string; readonly nombre: string; readonly tipo: string; readonly direccion: string; readonly telefono?: string; readonly seguros: readonly Seguro[] }
export const HORARIO_BASE: readonly string[] = ['08:00', '09:30', '10:00', '11:15', '15:30', '16:00'];
export interface Familiar { readonly id?: string; readonly dniTitular: string; readonly nombre: string; readonly parentesco: string; readonly dni: string; readonly seguro: string }
export interface Comentario { readonly id?: string; readonly sedeId: string; readonly autor: string; readonly texto: string; readonly puntaje: number; readonly fecha: string }
export type TipoReclamo = 'Reclamo' | 'Queja';
export interface Reclamo { readonly id?: string; readonly codigo: string; readonly tipo: TipoReclamo; readonly nombre: string; readonly dni: string; readonly correo: string; readonly telefono: string; readonly domicilio: string; readonly sede: string; readonly servicio: string; readonly detalle: string; readonly pedido: string; readonly fecha: string; readonly estado: 'Recibido' | 'En revisión' | 'Respondido' }
export interface Informe { readonly id?: string; readonly citaId: string; readonly dniPaciente: string; readonly paciente: string; readonly medicoId: string; readonly medicoNombre: string; readonly fecha: string; readonly presion?: string; readonly frecuencia?: number; readonly sintomas: string; readonly hallazgos: string; readonly diagnostico: string; readonly plan: string }