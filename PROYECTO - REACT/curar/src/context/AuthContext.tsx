import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { claves } from '../queries/claves';
import { curarApi } from '../services/curarApi';
import { HORARIO_BASE, ROLE_ADMIN, ROLE_MEDICO, type Sesion, type UsuarioApi } from '../types/cita';

const CLAVE = 'curar_sesion_activa';
const PENDIENTE = 'curar_pendiente_verificacion';

/** Simulación: en un sistema real el código se genera y se envía por correo. */
export const CODIGO_DEMO = '123456';

export type ResultadoLogin = 'ok' | 'error' | 'pendiente';

export interface DatosRegistro {
  readonly dni: string;
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
  readonly password: string;
  readonly rol: number;
  readonly cmp?: string;
  readonly especialidad?: string;
}

export interface AuthValue {
  readonly usuario: Sesion | null;
  inicio: () => string;
  pendiente: () => string | null;
  renombrar: (nombre: string) => void;
  ingresar: (dni: string, password: string) => Promise<ResultadoLogin>;
  registrar: (datos: DatosRegistro) => Promise<boolean>;
  verificar: (codigo: string) => Promise<boolean>;
  salir: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function leerSesion(): Sesion | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Sesion | null;
  } catch {
    return null;
  }
}

function aSesion(u: UsuarioApi): Sesion {
  return { dni: String(u.dni), nombre: u.nombre, rol: u.rol, ...(u.medicoId ? { medicoId: u.medicoId } : {}) };
}

/** Ruta de inicio según el rol (solo depende de la sesión recibida). */
export function rutaInicio(sesion: Sesion | null): string {
  const r = sesion?.rol ?? 0;
  return r & ROLE_ADMIN ? '/admin' : r & ROLE_MEDICO ? '/panel-medico' : '/panel';
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  // Login y registro son ACCIONES (no vistas de datos): llaman a la API directamente, pero avisan a la caché de lo que cambió.
  const cache = useQueryClient();
  const [usuario, setUsuario] = useState<Sesion | null>(leerSesion);
  // La referencia se actualiza al instante: `inicio()` debe ver la sesión recién abierta aunque React aún no haya re-renderizado.
  const sesionRef = useRef<Sesion | null>(usuario);

  const guardarSesion = useCallback((sesion: Sesion | null): void => {
    sesionRef.current = sesion;
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE);
    setUsuario(sesion);
  }, []);

  const abrir = useCallback((u: UsuarioApi): void => guardarSesion(aSesion(u)), [guardarSesion]);

  const valor = useMemo<AuthValue>(
    () => ({
      usuario,
      inicio: () => rutaInicio(sesionRef.current),
      pendiente: () => sessionStorage.getItem(PENDIENTE),
      renombrar(nombre) {
        const actual = sesionRef.current;
        if (actual) guardarSesion({ ...actual, nombre });
      },
      /** Demo académico: la verificación real de contraseñas debe hacerse en un backend con hash. */
      async ingresar(dni, password) {
        const [u] = await curarApi.usuarios(dni);
        if (!u || String(u.password) !== password) return 'error';
        if (u.verificado === false) {
          sessionStorage.setItem(PENDIENTE, String(u.dni));
          return 'pendiente';
        }
        abrir(u);
        return 'ok';
      },
      /** Crea la cuenta sin abrir sesión: primero hay que verificar el correo. Devuelve false si el DNI ya existe. */
      async registrar(d) {
        const existentes = await curarApi.usuarios(d.dni);
        if (existentes.length > 0) return false;
        const medicoId = d.rol === ROLE_MEDICO && d.cmp ? `m${d.cmp}` : undefined; // del CMP solo se valida el formato
        const nuevo: UsuarioApi = {
          dni: d.dni, nombre: d.nombre, correo: d.correo, telefono: d.telefono, password: d.password, rol: d.rol,
          verificado: false, creadoEn: new Date().toISOString(), ...(medicoId ? { medicoId, cmp: d.cmp } : {}),
        };
        if (medicoId) {
          await curarApi.altaMedico({
            id: medicoId, nombre: d.nombre, especialidad: d.especialidad ?? 'Medicina General', calificacion: 0,
            centro: 'Por asignar', horario: [...HORARIO_BASE], cmp: d.cmp ?? '', estado: 'Activo',
          });
        }
        const creado = await curarApi.registrar(nuevo);
        // Un médico nuevo aparece en el directorio y el conteo de pacientes del admin cambia: se invalidan ambos recursos.
        await Promise.all([cache.invalidateQueries({ queryKey: claves.usuarios.todos }), cache.invalidateQueries({ queryKey: claves.medicos.todos })]);
        sessionStorage.setItem(PENDIENTE, String(creado.dni));
        return true;
      },
      async verificar(codigo) {
        const dni = sessionStorage.getItem(PENDIENTE);
        if (!dni || codigo !== CODIGO_DEMO) return false;
        const [u] = await curarApi.usuarios(dni);
        if (!u?.id) return false;
        const actualizado = await curarApi.actualizarUsuario(u.id, { verificado: true });
        void cache.invalidateQueries({ queryKey: claves.usuarios.todos });
        sessionStorage.removeItem(PENDIENTE);
        abrir(actualizado);
        return true;
      },
      salir() {
        guardarSesion(null);
        cache.clear(); // los datos de la sesión anterior (citas, recetas…) no deben verse al entrar con otra cuenta
      },
    }),
    [usuario, abrir, guardarSesion, cache],
  );

  return <AuthContext value={valor}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
