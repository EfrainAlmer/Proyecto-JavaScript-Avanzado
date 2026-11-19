import { useId, type ReactNode } from 'react';
import { FieldMessage } from './FieldMessage';

/** Atributos de accesibilidad que Campo entrega al control para enlazarlo con su etiqueta, ayuda y error. */
export interface PropsAccesibles {
  readonly id: string;
  readonly 'aria-invalid': boolean;
  readonly 'aria-describedby'?: string;
}

interface CampoProps {
  readonly label: string;
  readonly error?: string | undefined;
  readonly ayuda?: string;
  readonly className?: string;
  /** Render prop: recibe los atributos accesibles y devuelve el input/select/textarea. */
  readonly children: (accesibles: PropsAccesibles) => ReactNode;
}

/**
 * Campo de formulario reutilizable. `useId` genera un id único por instancia, así que dos formularios
 * en la misma página (o el mismo componente usado dos veces) nunca repiten ids.
 */
export function Campo({ label, error, ayuda, className, children }: CampoProps) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describedBy = [ayuda ? idAyuda : '', error ? idError : ''].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id}>
        {label}
        {children({ id, 'aria-invalid': Boolean(error), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
      </label>
      {ayuda && <small id={idAyuda} className="note">{ayuda}</small>}
      <FieldMessage id={idError} message={error} />
    </div>
  );
}
