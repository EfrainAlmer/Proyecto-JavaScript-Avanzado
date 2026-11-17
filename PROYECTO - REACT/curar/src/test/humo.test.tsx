import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import baseDatos from '../../api/db.json';
import { rutas } from '../router';
import { Proveedores } from './utilidades';

type Registro = Record<string, unknown>;

/** API falsa respaldada por api/db.json: GET devuelve la colección; POST/PATCH/PUT/DELETE responden con eco. */
const CITA_PENDIENTE = { id: 'c-humo', dniPaciente: '12345678', paciente: 'Ana Paciente', medicoId: 'm1', seguro: 'SIS', fecha: '2026-11-18', hora: '09:30', estado: 'Pendiente', motivo: 'Dolor de cabeza' };

function apiFalsa() {
  const datos = structuredClone(baseDatos) as unknown as Record<string, Registro[]>;
  datos['citas']?.push(CITA_PENDIENTE); // db.json no trae citas pendientes de m1
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    const [coleccion = '', id] = new URL(url).pathname.split('/').filter(Boolean);
    const lista = datos[coleccion] ?? [];
    const metodo = init?.method ?? 'GET';
    const cuerpo = init?.body ? (JSON.parse(String(init.body)) as Registro) : {};
    let salida: unknown = lista;
    if (metodo === 'GET' && id) salida = lista.find((r) => String(r['id']) === id) ?? {};
    else if (metodo === 'POST') salida = { id: `nuevo-${lista.length}`, ...cuerpo };
    else if (metodo === 'PATCH' || metodo === 'PUT') salida = { ...(lista.find((r) => String(r['id']) === id) ?? {}), ...cuerpo };
    else if (metodo === 'DELETE') salida = {};
    return Promise.resolve(new Response(JSON.stringify(salida), { status: 200 }));
  }));
}

function montar(ruta: string, sesion?: object) {
  if (sesion) localStorage.setItem('curar_sesion_activa', JSON.stringify(sesion));
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(<Proveedores><RouterProvider router={router} /></Proveedores>);
  return router;
}

const PACIENTE = { dni: '12345678', nombre: 'Ana Paciente', rol: 1 };
const MEDICO = { dni: '87654321', nombre: 'Franco Espinola', rol: 2, medicoId: 'm1' };
const ADMIN = { dni: '11112222', nombre: 'Admin', rol: 4 };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  apiFalsa();
  vi.spyOn(console, 'error');
  window.scrollTo = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const sinErroresDeReact = (): void => {
  const llamadas = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
  expect(llamadas.filter((m) => !m.includes('not wrapped in act'))).toEqual([]);
};

const casos: readonly { ruta: string; sesion?: object; texto: string | RegExp }[] = [
  { ruta: '/', texto: /Tu cita médica, sin colas/u },
  { ruta: '/registro', texto: 'Crea una cuenta.' },
  { ruta: '/seguro', texto: '¿Con qué seguro te atiendes?' },
  { ruta: '/centros', texto: 'Centros de salud' },
  { ruta: '/reclamaciones', texto: 'Libro de Reclamaciones' },
  { ruta: '/medicos/m1', texto: /Formación y experiencia/u },
  { ruta: '/panel', sesion: PACIENTE, texto: /Hola, Ana Paciente/u },
  { ruta: '/citas', sesion: PACIENTE, texto: 'Mis citas' },
  { ruta: '/recetas', sesion: PACIENTE, texto: 'Mis recetas médicas' },
  { ruta: '/mensajes', sesion: PACIENTE, texto: 'Mensajes' },
  { ruta: '/historial', sesion: PACIENTE, texto: 'Historial médico' },
  { ruta: '/familiares', sesion: PACIENTE, texto: 'Mis familiares' },
  { ruta: '/cuenta', sesion: PACIENTE, texto: 'Mi cuenta' },
  { ruta: '/reservar', sesion: PACIENTE, texto: 'Reserva de cita médica' },
  { ruta: '/reservar?medicoId=m1', sesion: PACIENTE, texto: /Paso 4: Escoge fecha y hora/u },
  { ruta: '/panel-medico', sesion: MEDICO, texto: /Dr\(a\)\. Franco Espinola/u },
  { ruta: '/gestion-citas', sesion: MEDICO, texto: 'Gestión de pacientes' },
  { ruta: '/agenda', sesion: MEDICO, texto: 'Mi agenda' },
  { ruta: '/admin', sesion: ADMIN, texto: 'Panel de Administración General' },
];

describe('Prueba de humo: cada página se monta con datos reales de db.json', () => {
  it.each(casos)('$ruta', async ({ ruta, sesion, texto }) => {
    montar(ruta, sesion);
    expect((await screen.findAllByText(texto)).length).toBeGreaterThan(0);
    sinErroresDeReact();
  });

  it('/medicos y /sede exigen elegir seguro antes (redirige a /seguro)', async () => {
    const router = montar('/medicos');
    await waitFor(() => expect(router.state.location.pathname).toBe('/seguro'));
  });

  it('/consulta/:id carga la cita del médico y muestra el formulario de atención', async () => {
    montar(`/consulta/${CITA_PENDIENTE.id}`, MEDICO);
    expect(await screen.findByText('PACIENTE EN ATENCIÓN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar atención' })).toBeInTheDocument();
    sinErroresDeReact();
  });

  it('/consulta/:id rechaza una cita de otro médico', async () => {
    montar(`/consulta/${CITA_PENDIENTE.id}`, { ...MEDICO, medicoId: 'm2' });
    expect(await screen.findByText('Esta cita no pertenece a tu agenda.')).toBeInTheDocument();
  });

  it('reserva una cita completa: elegir hora, escribir el motivo y confirmar', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 16, 8, 0) }); // lunes 16-nov-2026, 08:00
    try {
      const peticiones = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      montar('/reservar?medicoId=m1', PACIENTE);
      const usuario = userEvent.setup();
      expect(await screen.findByText('Paso 4: Escoge fecha y hora')).toBeInTheDocument();

      await usuario.click(await screen.findByRole('button', { name: '09:30' }));
      await usuario.type(screen.getByLabelText('Motivo de consulta'), 'Dolor de cabeza');
      await usuario.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      expect(await screen.findByText('¡Cita confirmada exitosamente!')).toBeInTheDocument();
      const post = peticiones.filter(([url, init]) => String(url).endsWith('/citas') && (init as RequestInit | undefined)?.method === 'POST');
      expect(post).toHaveLength(1);
      expect(JSON.parse(String((post[0]?.[1] as RequestInit).body))).toMatchObject({ medicoId: 'm1', hora: '09:30', fecha: '2026-11-16', motivo: 'Dolor de cabeza', estado: 'Pendiente' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('exige hora y motivo antes de confirmar la reserva', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 16, 8, 0) });
    try {
      montar('/reservar?medicoId=m1', PACIENTE);
      const usuario = userEvent.setup();
      await usuario.click(await screen.findByRole('button', { name: 'Confirmar Reserva' }));
      expect(await screen.findByText('Elige un horario.')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
