import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { montarApp, simularFetch } from './utilidades';

function montar(ruta: string, sesion?: object) {
  if (sesion) localStorage.setItem('curar_sesion_activa', JSON.stringify(sesion));
  return montarApp(ruta);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Rutas', () => {
  it('redirige a /login cuando no hay sesión y se pide una ruta protegida', async () => {
    simularFetch(() => []);
    const router = montar('/panel');
    await waitFor(() => expect(router.pathname).toBe('/login'));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('redirige al inicio si el rol no tiene el permiso (paciente en /admin)', async () => {
    localStorage.setItem('curar_sesion_activa', JSON.stringify({ dni: '11111111', nombre: 'Luis', rol: 1 }));
    simularFetch(() => []);
    const router = montar('/admin');
    await waitFor(() => expect(router.pathname).toBe('/'));
  });

  it('muestra la página 404 para rutas desconocidas', async () => {
    simularFetch(() => []);
    montar('/no-existe');
    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });
});

describe('Login', () => {
  it('muestra errores de validación y no llama a la API con datos inválidos', async () => {
    const peticiones = simularFetch(() => []);
    montar('/login');
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('El DNI debe tener exactamente 8 dígitos.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(peticiones.filter((p) => p.url.includes('/usuarios'))).toHaveLength(0);
  });

  it('inicia sesión y navega al panel del paciente', async () => {
    simularFetch(() => [{ id: '1', dni: '12345678', nombre: 'Ana', rol: 1, password: 'abc12345', verificado: true }]);
    const router = montar('/login');
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByLabelText('DNI'), '12345678');
    await usuario.type(screen.getByLabelText('Contraseña'), 'abc12345');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => expect(router.pathname).toBe('/panel'));
  });

  it('informa credenciales incorrectas', async () => {
    simularFetch(() => []);
    montar('/login');
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByLabelText('DNI'), '12345678');
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('DNI o contraseña incorrectos.')).toBeInTheDocument();
  });
});

describe('Registro', () => {
  it('pide el CMP solo a médicos y envía los datos ya transformados', async () => {
    const peticiones = simularFetch((p) => (p.metodo === 'GET' ? [] : { ...(p.cuerpo as object), id: '9' }));
    const router = montar('/registro');
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Soy médico' }));
    await u.type(screen.getByLabelText('Correo electrónico'), 'Ana@Gmail.com');
    await u.click(screen.getByRole('button', { name: 'Siguiente' }));

    await u.type(await screen.findByLabelText('DNI'), '12345678');
    await u.type(screen.getByLabelText('Nombres y apellidos'), 'ana pérez');
    await u.type(screen.getByLabelText('Celular'), '912345678');
    await u.type(screen.getByLabelText('Contraseña'), 'abc12345');
    await u.type(screen.getByLabelText('Repite la contraseña'), 'abc12345');
    await u.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('El código CMP debe tener 5 o 6 dígitos.')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Código CMP (colegiatura)'), '12345');
    await u.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(router.pathname).toBe('/verificar'));

    const usuario = peticiones.find((p) => p.metodo === 'POST' && p.url.endsWith('/usuarios'))?.cuerpo;
    expect(usuario).toMatchObject({ nombre: 'Ana Pérez', correo: 'ana@gmail.com', rol: 2, cmp: '12345' });
    expect(usuario).not.toHaveProperty('confirmar');
  });
});
