import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Campo } from '../components/Campo';

describe('Campo (useId)', () => {
  it('dos campos con la misma etiqueta reciben ids distintos', () => {
    render(
      <>
        <Campo label="Nombre">{(a) => <input {...a} />}</Campo>
        <Campo label="Nombre">{(a) => <input {...a} />}</Campo>
      </>,
    );
    const [uno, dos] = screen.getAllByRole('textbox', { name: 'Nombre' });
    expect(uno?.id).toBeTruthy();
    expect(uno?.id).not.toBe(dos?.id);
  });

  it('enlaza ayuda y error con aria-describedby y marca aria-invalid', () => {
    const { rerender } = render(<Campo label="DNI" ayuda="8 dígitos.">{(a) => <input {...a} />}</Campo>);
    const input = screen.getByRole('textbox', { name: 'DNI' });
    expect(input).toHaveAccessibleDescription('8 dígitos.');
    expect(input).toHaveAttribute('aria-invalid', 'false');

    rerender(<Campo label="DNI" ayuda="8 dígitos." error="El DNI debe tener 8 dígitos.">{(a) => <input {...a} />}</Campo>);
    expect(input).toHaveAccessibleDescription('8 dígitos. El DNI debe tener 8 dígitos.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // El error no se mezcla con el nombre accesible del campo.
    expect(screen.getByRole('textbox', { name: 'DNI' })).toBe(input);
  });
});
