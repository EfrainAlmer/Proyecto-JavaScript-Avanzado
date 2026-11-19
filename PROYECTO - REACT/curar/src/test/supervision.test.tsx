import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SupervisionCitas } from '../components/admin/SupervisionCitas';
import type { Cita, Medico } from '../types/cita';

const medicos: Medico[] = [{ id: 'm1', nombre: 'Franco Espinola', especialidad: 'X', calificacion: 4, centro: 'c', horario: [] }];
const citas: Cita[] = Array.from({ length: 3000 }, (_, i) => ({
  id: `c${i}`, dniPaciente: String(10000000 + i), paciente: i % 3 === 0 ? 'Ana Torres' : 'Luis Ríos', medicoId: 'm1', seguro: 'SIS',
  fecha: `2026-${String((i % 12) + 1).padStart(2, '0')}-10`, hora: '09:00', estado: 'Pendiente',
}));

describe('SupervisionCitas (useDeferredValue + useMemo + memo + useTransition)', () => {
  it('filtra 3000 citas, ordena, pagina y conserva lo escrito', async () => {
    const u = userEvent.setup();
    const onAnular = vi.fn();
    render(<SupervisionCitas citas={citas} medicos={medicos} sedes={[]} anulando="" onAnular={onAnular} />);
    const buscar = screen.getByRole('searchbox', { name: 'Buscar paciente, DNI o médico' });
    const filas = (): HTMLElement[] => within(screen.getAllByRole('rowgroup')[1] as HTMLElement).getAllByRole('row');

    await u.type(buscar, 'ana');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1000 citas encontradas. Se muestran 50.'));
    expect(filas()).toHaveLength(50);
    expect(filas()[0]).toHaveTextContent('2026-10-10'); // Ana: meses 1, 4, 7 y 10

    await u.click(screen.getByRole('button', { name: 'Más recientes primero' }));
    await waitFor(() => expect(filas()[0]).toHaveTextContent('2026-01-10'));

    await u.click(screen.getByRole('button', { name: 'Mostrar 50 más' }));
    await waitFor(() => expect(filas()).toHaveLength(100));

    await u.click(within(filas()[0] as HTMLElement).getByRole('button', { name: 'Anular cita' }));
    expect(onAnular).toHaveBeenCalledWith('c0');
    expect(buscar).toHaveValue('ana'); // el input nunca se retrasó
  });

  it('el filtro de estado se aplica como transición y muestra "Sin coincidencias"', async () => {
    const u = userEvent.setup();
    render(<SupervisionCitas citas={citas} medicos={medicos} sedes={[]} anulando="" onAnular={vi.fn()} />);
    await u.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'Atendida');
    expect(await screen.findByText('Sin coincidencias.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('0 citas encontradas'));
  });
});
