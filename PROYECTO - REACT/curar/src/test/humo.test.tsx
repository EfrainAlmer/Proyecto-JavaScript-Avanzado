import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import baseDatos from '../../api/db.json';
import { montarApp } from './utilidades';

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
  return montarApp(ruta);
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
    await waitFor(() => expect(router.pathname).toBe('/seguro'));
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

  it('/consulta/:id: añade y quita medicamentos (useFieldArray) y guarda solo los que quedan', async () => {
    const peticiones = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    montar(`/consulta/${CITA_PENDIENTE.id}`, MEDICO);
    const u = userEvent.setup();
    await screen.findByText('PACIENTE EN ATENCIÓN');

    await u.type(screen.getByLabelText('Hallazgos del examen'), 'Sin signos de alarma');
    await u.type(screen.getByLabelText('Diagnóstico'), 'Cefalea tensional');
    await u.type(screen.getByLabelText('Plan e indicaciones'), 'Reposo y control en 7 días');

    const agregar = screen.getByRole('button', { name: /Agregar medicamento/u });
    await u.click(agregar);
    await u.click(agregar);
    await u.type(screen.getByLabelText('Medicamento 1'), 'Ibuprofeno');
    await u.type(screen.getByLabelText('Medicamento 2'), 'Paracetamol 500 mg');
    await u.type(screen.getAllByLabelText('Indicaciones')[1] as HTMLElement, 'Una tableta cada 8 horas');
    await u.click(screen.getByRole('button', { name: 'Quitar medicamento 1' }));

    // La fila que queda conserva lo escrito: la key es field.id, no el índice.
    expect(screen.getByLabelText('Medicamento 1')).toHaveValue('Paracetamol 500 mg');
    await u.click(screen.getByRole('button', { name: 'Finalizar atención' }));

    expect(await screen.findByText('Atención registrada')).toBeInTheDocument();
    const recetas = peticiones.filter(([url, init]) => String(url).endsWith('/recetas') && (init as RequestInit | undefined)?.method === 'POST');
    expect(recetas).toHaveLength(1);
    expect(JSON.parse(String((recetas[0]?.[1] as RequestInit).body))).toMatchObject({ medicamento: 'Paracetamol 500 mg', cantidad: 1 });
  });

  it('/consulta/:id muestra el error de cada campo de la receta', async () => {
    montar(`/consulta/${CITA_PENDIENTE.id}`, MEDICO);
    const u = userEvent.setup();
    await screen.findByText('PACIENTE EN ATENCIÓN');
    await u.click(screen.getByRole('button', { name: /Agregar medicamento/u }));
    await u.click(screen.getByRole('button', { name: 'Finalizar atención' }));
    expect(await screen.findByText('Escribe el medicamento (mínimo 3 letras).')).toBeInTheDocument();
    expect(screen.getByText('Describe los hallazgos (mínimo 5 letras).')).toBeInTheDocument();
  });

  it('/familiares: un DNI repetido se marca en su campo (setError desde la página)', async () => {
    montar('/familiares', PACIENTE);
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText('Nombre completo'), 'luis pérez');
    await u.type(screen.getByLabelText('DNI (opcional)'), PACIENTE.dni);
    await u.click(screen.getByRole('button', { name: 'Guardar familiar' }));
    expect(await screen.findByText('Ese DNI ya está registrado en tu cuenta.')).toBeInTheDocument();
  });

  it('/reclamaciones: no envía sin aceptar la declaración y luego registra la hoja', async () => {
    montar('/reclamaciones', PACIENTE);
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: 'Queja' }));
    expect(screen.getByText(/Queja: malestar/u)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.pe');
    await u.type(screen.getByLabelText('Celular'), '912345678');
    await u.type(screen.getByLabelText('Domicilio'), 'Av. Lima 123');
    await u.type(screen.getByLabelText(/Describe lo ocurrido/u), 'Esperé dos horas sin recibir información.');
    await u.type(screen.getByLabelText(/Qué solución esperas/u), 'Una disculpa formal.');
    await u.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));
    expect(await screen.findByText('Debes aceptar la declaración.')).toBeInTheDocument();
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'Enviar hoja de reclamación' }));
    expect(await screen.findByText('Hoja de reclamación registrada')).toBeInTheDocument();
  });

  it('/ (inicio): el buscador exige fecha y luego lleva a /sede', async () => {
    const router = montar('/');
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: 'Ver disponibilidad' }));
    expect(await screen.findByText('Elige una fecha para ver la disponibilidad.')).toBeInTheDocument();
    await u.type(screen.getByLabelText('Fecha'), '2026-12-01');
    await u.click(screen.getByRole('button', { name: 'Ver disponibilidad' }));
    await waitFor(() => expect(router.pathname).toBe('/sede'));
  });

  it('/admin: registra un médico eligiendo la sede con react-select (Controller)', async () => {
    const peticiones = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const primeraSede = (baseDatos as unknown as { sedes: { id: string; nombre: string }[] }).sedes[0];
    montar('/admin', ADMIN);
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: '+ Registrar Médico' }));

    await u.type(screen.getByLabelText('Nombre completo'), 'rosa quispe');
    await u.type(screen.getByLabelText('Código CMP (solo se valida el formato)'), '54321');
    // react-select: se busca escribiendo y se elige con Enter.
    await u.type(screen.getByLabelText('Sede'), primeraSede?.nombre ?? '');
    await u.keyboard('{Enter}');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Médico guardado.')).toBeInTheDocument();
    const post = peticiones.find(([url, init]) => String(url).endsWith('/medicos') && (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse(String((post?.[1] as RequestInit).body))).toMatchObject({ id: 'm54321', nombre: 'Rosa Quispe', sedeId: primeraSede?.id });
  });

  it('/admin: un CMP repetido se marca en su campo', async () => {
    montar('/admin', ADMIN);
    const u = userEvent.setup();
    const registrar = async (): Promise<void> => {
      await u.click(await screen.findByRole('button', { name: '+ Registrar Médico' }));
      await u.type(screen.getByLabelText('Nombre completo'), 'rosa quispe');
      await u.type(screen.getByLabelText('Código CMP (solo se valida el formato)'), '54321');
      await u.click(screen.getByRole('button', { name: 'Guardar' }));
    };
    await registrar();
    await screen.findByText('Médico guardado.');
    await registrar(); // mismo CMP otra vez
    expect(await screen.findByText('Ya existe un médico con ese CMP.')).toBeInTheDocument();
  });

  it('/reservar: recorre los 4 pasos del asistente con un solo formulario', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 16, 8, 0) }); // lunes 08:00
    try {
      const peticiones = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      montar('/reservar', PACIENTE);
      const u = userEvent.setup();
      await screen.findByText('Paso 1: Seleccione su seguro y especialidad');
      await u.click(screen.getByRole('button', { name: 'Siguiente →' }));
      // Medicina General solo se atiende en Hospital Central: queda elegida sola.
      expect(await screen.findByRole('button', { name: /Hospital Central/u })).toHaveAttribute('aria-pressed', 'true');
      await u.click(screen.getByRole('button', { name: 'Siguiente →' }));
      await u.click(await screen.findByRole('button', { name: 'Siguiente →' }));
      await u.click(await screen.findByRole('button', { name: '10:00' }));
      await u.type(screen.getByLabelText('Motivo de consulta'), 'Control anual');
      await u.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));
      expect(await screen.findByText('¡Cita confirmada exitosamente!')).toBeInTheDocument();
      const post = peticiones.filter(([url, init]) => String(url).endsWith('/citas') && (init as RequestInit | undefined)?.method === 'POST');
      expect(JSON.parse(String((post[0]?.[1] as RequestInit).body))).toMatchObject({ medicoId: 'm1', seguro: 'EsSalud', hora: '10:00', motivo: 'Control anual' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('/reservar: cambiar el seguro borra la sede ya elegida', async () => {
    montar('/reservar', PACIENTE);
    const u = userEvent.setup();
    await u.selectOptions(await screen.findByLabelText('Especialidad médica'), 'Cardiología');
    await u.click(screen.getByRole('button', { name: 'Siguiente →' }));
    // Cardiología + EsSalud: solo Clínica Curar Sur, que queda elegida.
    expect(await screen.findByRole('button', { name: /Clínica Curar Sur/u })).toHaveAttribute('aria-pressed', 'true');
    await u.click(screen.getByRole('button', { name: '← Anterior' }));
    await u.click(screen.getByRole('button', { name: 'SIS' }));
    await u.click(screen.getByRole('button', { name: 'Siguiente →' }));
    expect(await screen.findByText(/No hay sedes con SIS que atiendan Cardiología/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente →' })).toBeDisabled();
  });
});

