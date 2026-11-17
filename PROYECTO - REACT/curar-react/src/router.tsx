import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RutaProtegida } from './components/RutaProtegida';
import { PERM_GESTIONAR, PERM_RECETAR, PERM_RESERVAR } from './types/cita';

type Modulo = Record<string, React.ComponentType>;

/** Ruta con carga diferida (equivale a `loadComponent` de Angular) y título para el documento. */
const ruta = (titulo: string, path: string | undefined, nombre: string, cargar: () => Promise<Modulo>): RouteObject => ({
  ...(path === undefined ? { index: true } : { path }),
  handle: { titulo },
  lazy: async () => ({ Component: (await cargar())[nombre] as React.ComponentType }),
});

export const rutas: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      ruta('Curar · Reserva de citas médicas', undefined, 'Home', () => import('./pages/Home')),
      ruta('Iniciar sesión', 'login', 'Login', () => import('./pages/Login')),
      ruta('Crear cuenta', 'registro', 'Registro', () => import('./pages/Registro')),
      ruta('Verificar correo', 'verificar', 'Verificar', () => import('./pages/Verificar')),
      ruta('Elige tu seguro', 'seguro', 'ElegirSeguro', () => import('./pages/ElegirSeguro')),
      ruta('Elige tu sede', 'sede', 'ElegirSede', () => import('./pages/ElegirSede')),
      ruta('Buscar médicos', 'medicos', 'Medicos', () => import('./pages/Medicos')),
      ruta('Perfil del médico', 'medicos/:id', 'PerfilMedico', () => import('./pages/PerfilMedico')),
      ruta('Centros de salud', 'centros', 'Centros', () => import('./pages/Centros')),
      ruta('Libro de Reclamaciones', 'reclamaciones', 'Reclamaciones', () => import('./pages/Reclamaciones')),
      {
        element: <RutaProtegida permiso={PERM_RESERVAR} />,
        children: [
          ruta('Historial médico', 'historial', 'Historial', () => import('./pages/Historial')),
          ruta('Mis familiares', 'familiares', 'Familiares', () => import('./pages/Familiares')),
          ruta('Reservar cita', 'reservar', 'Reservar', () => import('./pages/Reservar')),
          ruta('Mi panel', 'panel', 'PanelPaciente', () => import('./pages/PanelPaciente')),
          ruta('Mi cuenta', 'cuenta', 'CuentaPaciente', () => import('./pages/CuentaPaciente')),
          ruta('Mis citas', 'citas', 'Citas', () => import('./pages/Citas')),
          ruta('Mis recetas', 'recetas', 'Recetas', () => import('./pages/Recetas')),
          ruta('Mensajes', 'mensajes', 'Mensajes', () => import('./pages/Mensajes')),
        ],
      },
      {
        element: <RutaProtegida permiso={PERM_RECETAR} />,
        children: [
          ruta('Panel médico', 'panel-medico', 'PanelMedico', () => import('./pages/PanelMedico')),
          ruta('Gestión de citas', 'gestion-citas', 'GestionCitas', () => import('./pages/GestionCitas')),
          ruta('Atención médica', 'consulta/:id', 'Consulta', () => import('./pages/Consulta')),
          ruta('Mi agenda', 'agenda', 'Agenda', () => import('./pages/Agenda')),
        ],
      },
      {
        element: <RutaProtegida permiso={PERM_GESTIONAR} />,
        children: [ruta('Administración', 'admin', 'Admin', () => import('./pages/Admin'))],
      },
      ruta('Página no encontrada', '*', 'NoEncontrada', () => import('./pages/NoEncontrada')),
    ],
  },
];

export const router = createBrowserRouter(rutas);
