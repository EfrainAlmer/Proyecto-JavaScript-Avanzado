import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import baseDatos from '../../api/base.json';
import { montarApp } from './utilidades';

type Registro = Record<string, unknown>;

/** API falsa respaldada por api/base.json (datos fijos, no los que cambia json-server): GET devuelve la colección; POST/PATCH/PUT/DELETE responden con eco. */
const CITA_PENDIENTE = { id: 'c-humo', dniPaciente: '12345678', paciente: 'Ana Paciente', medicoId: 'm1', seguro: 'SIS', fecha: '2026-11-18', hora: '09:30', estado: 'Pendiente', motivo: 'Dolor de cabeza' };

function apiFalsa() {
  const datos = structuredClone(baseDatos) as unknown as Record<string, Registro[]>;
  datos['citas']?.push(CITA_PENDIENTE); // db.json no trae citas pendientes de m1
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    // Las URL ahora son relativas (/api/medicos): se resuelven contra un origen ficticio y se quita el prefijo /api.
    const [coleccion = '', id] = new URL(url, 'http://localhost').pathname.replace(/^\/api/u, '').split('/').filter(Boolean);
    const lista = datos[coleccion] ?? [];
    const metodo = init?.method ?? 'GET';
    const cuerpo = init?.body ? (JSON.parse(String(init.body)) as Registro) : {};
    // La API falsa GUARDA los cambios (como json-server): tras invalidar, el GET siguiente ve lo escrito.
    let salida: unknown = lista;
    const i = lista.findIndex((r) => String(r['id']) === id);
    if (metodo === 'GET' && id) salida = lista[i] ?? {};
    else if (metodo === 'POST') {
      salida = { id: `nuevo-${lista.length}`, ...cuerpo };
      datos[coleccion] = [...lista, salida as Registro];
    } else if (metodo === 'PATCH' || metodo === 'PUT') {
      salida = { ...(lista[i] ?? {}), ...cuerpo };
      datos[coleccion] = lista.map((r, j) => (j === i ? (salida as Registro) : r));
    } else if (metodo === 'DELETE') {
      salida = {};
      datos[coleccion] = lista.filter((_r, j) => j !== i);
    }
    return Promise.resolve(new Response(JSON.stringify(salida), { status: 200 }));
  }));
}

/** Monta dentro de un `act` asíncrono: necesario cuando una página suspende con `use()` (como en el md). */
async function montar(ruta: string, sesion?: object): Promise<{ pathname: string }> {
  if (sesion) localStorage.setItem('curar_sesion_activa', JSON.stringify(sesion));
  let ubicacion: { pathname: string } = { pathname: ruta };
  await act(async () => {
    ubicacion = montarApp(ruta);
  });
  return ubicacion;
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
    await montar(ruta, sesion);
    expect((await screen.findAllByText(texto)).length).toBeGreaterThan(0);
    sinErroresDeReact();
  });

  it('/medicos y /sede exigen elegir seguro antes (redirige a /seguro)', async () => {
    const router = await montar('/medicos');
    await waitFor(() => expect(router.pathname).toBe('/seguro'));
  });

  it('/consulta/:id carga la cita del médico y muestra el formulario de atención', async () => {
    await montar(`/consulta/${CITA_PENDIENTE.id}`, MEDICO);
    expect(await screen.findByText('PACIENTE EN ATENCIÓN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar atención' })).toBeInTheDocument();
    sinErroresDeReact();
  });

  it('/consulta/:id rechaza una cita de otro médico', async () => {
    await montar(`/consulta/${CITA_PENDIENTE.id}`, { ...MEDICO, medicoId: 'm2' });
    expect(await screen.findByText('Esta cita no pertenece a tu agenda.')).toBeInTheDocument();
  });

  it('reserva una cita completa: elegir hora, escribir el motivo y confirmar', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 16, 8, 0) }); // lunes 16-nov-2026, 08:00
    try {
      const peticiones = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      await montar('/reservar?medicoId=m1', PACIENTE);
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
      await montar('/reservar?medicoId=m1', PACIENTE);
      const usuario = userEvent.setup();
      await usuario.click(await screen.findByRole('button', { name: 'Confirmar Reserva' }));
      expect(await screen.findByText('Elige un horario.')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('/consulta/:id: añade y quita medicamentos (useFieldArray) y guarda solo los que quedan', async () => {
    const peticiones = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    await montar(`/consulta/${CITA_PENDIENTE.id}`, MEDICO);
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
    await montar(`/consulta/${CITA_PENDIENTE.id}`, MEDICO);
    const u = userEvent.setup();
    await screen.findByText('PACIENTE EN ATENCIÓN');
    await u.click(screen.getByRole('button', { name: /Agregar medicamento/u }));
    await u.click(screen.getByRole('button', { name: 'Finalizar atención' }));
    expect(await screen.findByText('Escribe el medicamento (mínimo 3 letras).')).toBeInTheDocument();
    expect(screen.getByText('Describe los hallazgos (mínimo 5 letras).')).toBeInTheDocument();
  });

  it('/familiares: un DNI repetido se marca en su campo (setError desde la página)', async () => {
    await montar('/familiares', PACIENTE);
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText('Nombre completo'), 'luis pérez');
    await u.type(screen.getByLabelText('DNI (opcional)'), PACIENTE.dni);
    await u.click(screen.getByRole('button', { name: 'Guardar familiar' }));
    expect(await screen.findByText('Ese DNI ya está registrado en tu cuenta.')).toBeInTheDocument();
  });

  it('/reclamaciones: no envía sin aceptar la declaración y luego registra la hoja', async () => {
    await montar('/reclamaciones', PACIENTE);
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
    const router = await montar('/');
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
    await montar('/admin', ADMIN);
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

  it('Layout: avisa sin conexión (useSyncExternalStore) y compensa la cabecera fija (useLayoutEffect)', async () => {
    await montar('/');
    expect(document.documentElement.style.getPropertyValue('scroll-padding-top')).toMatch(/px$/u);
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByText(/Sin conexión a internet/u)).toBeInTheDocument();
    enLinea.mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(screen.queryByText(/Sin conexión a internet/u)).not.toBeInTheDocument();
  });

  it('/historial: el rango de fechas filtra, marca el intervalo invertido en "Hasta" y Limpiar restablece', async () => {
    await montar('/historial', PACIENTE);
    expect(await screen.findAllByText('2026-10-01', { exact: false })).toHaveLength(2); // atención + receta
    const desde = screen.getByLabelText('Desde');
    const hasta = screen.getByLabelText('Hasta');
    fireEvent.change(desde, { target: { value: '2026-11-01' } });
    fireEvent.change(hasta, { target: { value: '2026-10-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar fechas' }));
    expect(await screen.findByText('La fecha final no puede ser anterior a la de inicio.')).toBeInTheDocument();
    expect(hasta).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('2026-10-01', { exact: false })).toHaveLength(2); // un rango inválido no filtra

    fireEvent.change(hasta, { target: { value: '2026-11-30' } });
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar fechas' }));
    expect(await screen.findByText('No hay registros con estos filtros.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar fechas' }));
    expect(await screen.findAllByText('2026-10-01', { exact: false })).toHaveLength(2); // atención + receta
    expect(desde).toHaveValue('');
    expect(hasta).toHaveValue('');
  });

  it('/admin: avanzar un reclamo lo escribe con useMutation y la lista se relee (invalidación)', async () => {
    const reclamo = { codigo: 'LR-1', tipo: 'Reclamo', nombre: 'Ana', dni: '12345678', correo: 'ana@ejemplo.pe', telefono: '999999999', domicilio: 'Lima', sede: 's1', servicio: 'Citas', detalle: 'Demora', pedido: 'Atención', fecha: '2026-11-18', estado: 'Recibido' };
    await fetch('/api/reclamos', { method: 'POST', body: JSON.stringify(reclamo) }); // la API falsa lo guarda
    await montar('/admin', ADMIN);
    await userEvent.click(await screen.findByRole('tab', { name: 'Libro de Reclamaciones' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar revisión' }));
    expect(await screen.findByRole('button', { name: 'Marcar respondido' })).toBeInTheDocument();
    const patch = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(patch).toHaveLength(1);
  });

  it('/admin: Actualizar vuelve a pedir las citas a la API', async () => {
    await montar('/admin', ADMIN);
    await userEvent.click(await screen.findByRole('tab', { name: 'Supervisión de Citas' }));
    await screen.findByText(/Actualizado a las/u);
    const pedidas = (): number => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/citas')).length;
    const antes = pedidas();
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(pedidas()).toBe(antes + 1));
  });

  it('/admin: Cancelar consulta aborta la lectura de citas y lo explica', async () => {
    const real = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation((url, init) => {
      // La lectura global de citas queda colgada hasta que alguien la aborte.
      if (String(url).endsWith('/citas')) {
        return new Promise((_ok, falla) => init?.signal?.addEventListener('abort', () => falla(init.signal?.reason)));
      }
      return real(url, init);
    });
    await montar('/admin', ADMIN);
    await userEvent.click(await screen.findByRole('tab', { name: 'Supervisión de Citas' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar consulta' }));
    expect(await screen.findByText('Sin consulta activa. Pulsa Actualizar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
  });

  it('/admin: un CMP repetido se marca en su campo', async () => {
    await montar('/admin', ADMIN);
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
      await montar('/reservar', PACIENTE);
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
    await montar('/reservar', PACIENTE);
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

  it('/ (inicio): el carrusel se pausa con el puntero sin reinstalar el temporizador (useEffectEvent)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const instalar = vi.spyOn(window, 'setInterval');
      await montar('/');
      await screen.findAllByText(/Tu cita médica, sin colas/u);
      const hero = document.getElementById('inicio') as HTMLElement;
      const activa = (): string => (document.querySelector('.slide.on')?.classList.contains('s1') ? 's1' : 's2');
      expect(activa()).toBe('s1');
      act(() => vi.advanceTimersByTime(6500));
      expect(activa()).toBe('s2');

      fireEvent.mouseEnter(hero);
      act(() => vi.advanceTimersByTime(6500 * 3));
      expect(activa()).toBe('s2'); // pausado: no avanza

      fireEvent.mouseLeave(hero);
      act(() => vi.advanceTimersByTime(6500));
      expect(activa()).toBe('s1');
      expect(instalar.mock.calls.filter(([, ms]) => ms === 6500)).toHaveLength(1); // pausar no lo reinició
    } finally {
      vi.useRealTimers();
    }
  });

  it('/panel-medico: recarga la agenda al volver a la pestaña con un único listener', async () => {
    const llamadas = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const citasPedidas = (): number => llamadas.filter(([url]) => String(url).endsWith('/citas')).length;
    const escuchar = vi.spyOn(document, 'addEventListener');
    await montar('/panel-medico', MEDICO);
    await screen.findByText(/Dr\(a\)\. Franco Espinola/u);
    await waitFor(() => expect(citasPedidas()).toBe(1));

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(citasPedidas()).toBe(2));
    expect(escuchar.mock.calls.filter(([tipo]) => tipo === 'visibilitychange')).toHaveLength(1);
  });

  it('/reservar: el foco va al título de cada paso y vuelve al botón que abrió el perfil (useRef)', async () => {
    await montar('/reservar', PACIENTE);
    const u = userEvent.setup();
    await screen.findByText('Paso 1: Seleccione su seguro y especialidad');
    await u.click(screen.getByRole('button', { name: 'Siguiente →' }));
    expect(await screen.findByRole('heading', { name: 'Paso 2: Seleccione la sede o centro de salud' })).toHaveFocus();
    await u.click(screen.getByRole('button', { name: 'Siguiente →' }));
    expect(await screen.findByRole('heading', { name: 'Paso 3: Seleccione al profesional de la salud' })).toHaveFocus();

    const verPerfil = screen.getByRole('button', { name: /Ver perfil/u });
    await u.click(verPerfil);
    expect(screen.getByRole('button', { name: 'Cerrar perfil' })).toHaveFocus();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(verPerfil).toHaveFocus();
  });

  it('/cuenta: los dos formularios de la página no repiten ids (useId)', async () => {
    await montar('/cuenta', PACIENTE);
    const u = userEvent.setup();
    await u.click(await screen.findByRole('tab', { name: 'Mi perfil' }));
    const ids = [...document.querySelectorAll('input[id]')].map((e) => e.id);
    expect(ids.length).toBeGreaterThan(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('/recetas: use() + Suspense muestra la carga, el ErrorBoundary el fallo, y Reintentar vuelve a leer', async () => {
    const real = fetch;
    const fallarRecetas = { activo: true };
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) =>
      String(url).endsWith('/recetas') && fallarRecetas.activo ? Promise.resolve(new Response('', { status: 500 })) : real(url, init),
    ));
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React informa el error capturado por el límite
    await montar('/recetas', PACIENTE);
    const u = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus recetas. La API falló.');
    fallarRecetas.activo = false;
    // Como en el md: el clic que crea la promesa nueva va dentro de act para que React procese la suspensión.
    await act(async () => {
      await u.click(screen.getByRole('button', { name: 'Reintentar' }));
    });
    expect(await screen.findByRole('list', { name: 'Recetas' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('/recetas: muestra "Cargando recetas…" mientras la promesa está pendiente', async () => {
    const real = fetch;
    const pendiente = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => (String(url).endsWith('/recetas') ? pendiente.promise : real(url, init))));
    await montar('/recetas', PACIENTE);
    expect(await screen.findByText('Cargando recetas…')).toBeInTheDocument();
    await act(async () => {
      pendiente.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    expect(await screen.findByText('Aún no tienes recetas registradas.')).toBeInTheDocument();
  });

  it('/medicos/:id: el favorito cambia al instante y se confirma al responder la API (useOptimistic)', async () => {
    const real = fetch;
    const puerta = Promise.withResolvers<void>();
    // El POST espera a que la prueba "abra la puerta"; luego lo guarda la API falsa (así el GET posterior lo ve).
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) =>
      String(url).endsWith('/favoritos') && init?.method === 'POST' ? puerta.promise.then(() => real(url, init)) : real(url, init),
    ));
    await montar('/medicos/m1', PACIENTE);
    const u = userEvent.setup();
    const boton = await screen.findByRole('button', { name: '☆ Agregar a favoritos' });

    await u.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'true'); // optimista: aún no hay respuesta
    expect(boton).toHaveTextContent('★ Quitar de favoritos');

    await act(async () => {
      puerta.resolve();
    });
    expect(boton).toHaveAttribute('aria-pressed', 'true'); // confirmado
    expect(boton).toHaveAttribute('aria-busy', 'false');
  });

  it('/medicos/:id: si la API falla, el favorito vuelve solo a su estado real y avisa', async () => {
    const real = fetch;
    const respuesta = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) =>
      String(url).endsWith('/favoritos') && init?.method === 'POST' ? respuesta.promise : real(url, init),
    ));
    await montar('/medicos/m1', PACIENTE);
    const u = userEvent.setup();
    const boton = await screen.findByRole('button', { name: '☆ Agregar a favoritos' });

    await u.click(boton);
    expect(boton).toHaveAttribute('aria-pressed', 'true');
    await act(async () => {
      respuesta.resolve(new Response('', { status: 500 }));
    });
    expect(boton).toHaveAttribute('aria-pressed', 'false'); // revertido sin código de "deshacer"
    expect(screen.getByText('No se pudo actualizar el favorito. La API falló. Intenta más tarde.')).toBeInTheDocument();
    // Un solo aviso: el error no se repite en el mensaje general de la página.
    expect(screen.getAllByText(/La API falló/u)).toHaveLength(1);
  });

  it('/centros: si falla PUBLICAR un comentario, la lista leída se conserva y el error se muestra aparte', async () => {
    const real = fetch;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) =>
      String(url).endsWith('/comentarios') && init?.method === 'POST' ? Promise.resolve(new Response('', { status: 500 })) : real(url, init),
    ));
    await montar('/centros', PACIENTE);
    const u = userEvent.setup();
    await u.click((await screen.findAllByRole('button', { name: 'Ver comentarios' }))[1] as HTMLElement); // Policlínico Santa Cruz (tiene 1)
    expect(await screen.findByText(/Atención ordenada y puntual/u)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Tu comentario'), 'Muy buena atención');
    await u.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    expect(await screen.findByText('No se publicó tu comentario. La API falló. Intenta más tarde.')).toBeInTheDocument();
    expect(screen.getByText(/Atención ordenada y puntual/u)).toBeInTheDocument(); // la lectura no se perdió
    expect(screen.getByLabelText('Tu comentario')).toHaveValue('Muy buena atención'); // y lo escrito tampoco
  });

  it('/reservar: si el POST sale bien pero la recarga de citas falla, se conserva la confirmación y NO se reenvía el POST', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 16, 8, 0) });
    try {
      const real = fetch;
      const estado = { postHecho: false };
      const espia = vi.fn((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/citas') && init?.method === 'POST') estado.postHecho = true;
        else if (String(url).endsWith('/citas') && estado.postHecho) return Promise.resolve(new Response('', { status: 503 })); // la LECTURA posterior falla
        return real(url, init);
      });
      vi.stubGlobal('fetch', espia);
      await montar('/reservar?medicoId=m1', PACIENTE);
      const u = userEvent.setup();
      await u.click(await screen.findByRole('button', { name: '09:30' }));
      await u.type(screen.getByLabelText('Motivo de consulta'), 'Control');
      await u.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      expect(await screen.findByText('¡Cita confirmada exitosamente!')).toBeInTheDocument();
      expect(screen.getByText(/N\.º de cita:/u)).toBeInTheDocument(); // el recibo viene de la respuesta del POST
      const posts = espia.mock.calls.filter(([url, init]) => String(url).endsWith('/citas') && init?.method === 'POST');
      expect(posts).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('/reservar: un 409 del servidor muestra el conflicto, conserva lo escrito y no invalida ni relee citas', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 16, 8, 0) });
    try {
      const real = fetch;
      const espia = vi.fn((url: string, init?: RequestInit) => {
        // json-server nunca lo hace: simulamos el servidor real que rechaza una hora ya tomada.
        if (String(url).endsWith('/citas') && init?.method === 'POST') return Promise.resolve(new Response('{}', { status: 409 }));
        return real(url, init);
      });
      vi.stubGlobal('fetch', espia);
      await montar('/reservar?medicoId=m1', PACIENTE);
      const u = userEvent.setup();
      await u.click(await screen.findByRole('button', { name: '09:30' }));
      await u.type(screen.getByLabelText('Motivo de consulta'), 'Control');
      await u.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

      expect(await screen.findByText(/conflicto con otro cambio/u)).toBeInTheDocument();
      expect(screen.queryByText('¡Cita confirmada exitosamente!')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Motivo de consulta')).toHaveValue('Control');
      // Sin éxito no hay invalidación: después del POST rechazado no se vuelve a leer ninguna lista de citas.
      const llamadas = espia.mock.calls;
      const iPost = llamadas.findIndex(([url, init]) => String(url).endsWith('/citas') && init?.method === 'POST');
      expect(iPost).toBeGreaterThan(-1);
      const lecturasTrasPost = llamadas.slice(iPost + 1).filter(([url, init]) => String(url).includes('/citas') && (init?.method ?? 'GET') === 'GET');
      expect(lecturasTrasPost).toHaveLength(0);
      expect(llamadas.filter(([, init]) => init?.method === 'POST')).toHaveLength(1); // y no se reintenta
    } finally {
      vi.useRealTimers();
    }
  });

  it('/citas: cancelar actualiza la lista por invalidación, sin tocar el estado a mano', async () => {
    await montar('/citas', PACIENTE);
    const u = userEvent.setup();
    const antes = (await screen.findAllByRole('button', { name: 'Cancelar cita' })).length;
    await u.click(screen.getAllByRole('button', { name: 'Cancelar cita' })[0] as HTMLElement);
    await u.click(screen.getByRole('button', { name: 'Sí, cancelar' }));
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Cancelar cita' })).toHaveLength(antes - 1));
  });
});

