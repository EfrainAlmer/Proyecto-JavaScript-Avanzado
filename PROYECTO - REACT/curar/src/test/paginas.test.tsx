import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rutas } from '../router';
import { Proveedores, simularFetch } from './utilidades';

function montar(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  render(
    <Proveedores>
      <RouterProvider router={router} />
    </Proveedores>,
  );
  return router;
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
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('redirige al inicio si el rol no tiene el permiso (paciente en /admin)', async () => {
    localStorage.setItem('curar_sesion_activa', JSON.stringify({ dni: '11111111', nombre: 'Luis', rol: 1 }));
    simularFetch(() => []);
    const router = montar('/admin');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
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
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'));
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
