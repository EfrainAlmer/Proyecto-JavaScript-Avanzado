import type { Routes } from '@angular/router';
import { PERM_GESTIONAR, PERM_RECETAR, PERM_RESERVAR } from './modelos/cita';
import { conPermiso } from './servicios/auth';
const paciente = [conPermiso(PERM_RESERVAR)], medico = [conPermiso(PERM_RECETAR)], admin = [conPermiso(PERM_GESTIONAR)];
export const routes: Routes = [
  { path: '', title: 'Curar · Reserva de citas médicas', loadComponent: () => import('./paginas/home').then((m) => m.Home) },
  { path: 'login', title: 'Iniciar sesión', loadComponent: () => import('./paginas/login').then((m) => m.Login) },
  { path: 'registro', title: 'Crear cuenta', loadComponent: () => import('./paginas/registro').then((m) => m.Registro) },
  { path: 'verificar', title: 'Verificar correo', loadComponent: () => import('./paginas/verificar').then((m) => m.Verificar) },
  { path: 'seguro', title: 'Elige tu seguro', loadComponent: () => import('./paginas/elegir-seguro').then((m) => m.ElegirSeguro) },
  { path: 'sede', title: 'Elige tu sede', loadComponent: () => import('./paginas/elegir-sede').then((m) => m.ElegirSede) },
  { path: 'medicos', title: 'Buscar médicos', loadComponent: () => import('./paginas/medicos').then((m) => m.Medicos) },
  { path: 'medicos/:id', title: 'Perfil del médico', loadComponent: () => import('./paginas/perfil-medico').then((m) => m.PerfilMedico) },
  { path: 'centros', title: 'Centros de salud', loadComponent: () => import('./paginas/centros').then((m) => m.Centros) },
  { path: 'historial', title: 'Historial médico', canActivate: paciente, loadComponent: () => import('./paginas/historial').then((m) => m.Historial) },
  { path: 'familiares', title: 'Mis familiares', canActivate: paciente, loadComponent: () => import('./paginas/familiares').then((m) => m.Familiares) },
  { path: 'reservar', title: 'Reservar cita', canActivate: paciente, loadComponent: () => import('./paginas/reservar').then((m) => m.Reservar) },
  { path: 'panel', title: 'Mi panel', canActivate: paciente, loadComponent: () => import('./paginas/panel-paciente').then((m) => m.PanelPaciente) },
  { path: 'cuenta', title: 'Mi cuenta', canActivate: paciente, loadComponent: () => import('./paginas/cuenta-paciente').then((m) => m.CuentaPaciente) },
  { path: 'citas', title: 'Mis citas', canActivate: paciente, loadComponent: () => import('./paginas/citas').then((m) => m.Citas) },
  { path: 'recetas', title: 'Mis recetas', canActivate: paciente, loadComponent: () => import('./paginas/recetas').then((m) => m.Recetas) },
  { path: 'mensajes', title: 'Mensajes', canActivate: paciente, loadComponent: () => import('./paginas/mensajes').then((m) => m.Mensajes) },
  { path: 'panel-medico', title: 'Panel médico', canActivate: medico, loadComponent: () => import('./paginas/panel-medico').then((m) => m.PanelMedico) },
  { path: 'gestion-citas', title: 'Gestión de citas', canActivate: medico, loadComponent: () => import('./paginas/gestion-citas').then((m) => m.GestionCitas) },
  { path: 'consulta/:id', title: 'Atención médica', canActivate: medico, loadComponent: () => import('./paginas/consulta').then((m) => m.Consulta) },
  { path: 'agenda', title: 'Mi agenda', canActivate: medico, loadComponent: () => import('./paginas/agenda').then((m) => m.Agenda) },
  { path: 'admin', title: 'Administración', canActivate: admin, loadComponent: () => import('./paginas/admin').then((m) => m.Admin) },
    { path: 'reclamaciones', title: 'Libro de Reclamaciones', loadComponent: () => import('./paginas/reclamaciones').then((m) => m.Reclamaciones) },
  { path: '**', title: 'Página no encontrada', loadComponent: () => import('./paginas/no-encontrada').then((m) => m.NoEncontrada) },
];
