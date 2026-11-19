import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { rangoFechasSchema, rangoInicial, type RangoFechasData, type RangoFechasInput } from '../model/rango';
import { Campo } from './Campo';

interface FiltroFechasProps {
  /** Recibe SOLO datos ya validados por el esquema; null al limpiar. */
  readonly onAplicar: (rango: RangoFechasData | null) => void;
}

/**
 * Formulario "Desde / Hasta" (Lab 12 · reto obligatorio). Los valores viven en react-hook-form;
 * el padre solo guarda el último rango APLICADO, que es otro dato (lo que filtra la lista), no una copia de los campos.
 */
export function FiltroFechas({ onAplicar }: FiltroFechasProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RangoFechasInput, unknown, RangoFechasData>({
    resolver: zodResolver(rangoFechasSchema),
    defaultValues: rangoInicial(),
  });

  function limpiar(): void {
    reset(rangoInicial()); // restablece ambos campos y sus errores
    onAplicar(null);
  }

  return (
    <form noValidate onSubmit={handleSubmit(onAplicar)} aria-label="Filtrar por fechas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
      <Campo label="Desde" error={errors.fechaInicio?.message}>{(a11y) => <input type="date" {...a11y} {...register('fechaInicio')} />}</Campo>
      <Campo label="Hasta" error={errors.fechaFin?.message}>{(a11y) => <input type="date" {...a11y} {...register('fechaFin')} />}</Campo>
      {/* .acciones-campo reserva arriba el alto de una etiqueta: los botones quedan a la altura de los inputs,
          aunque debajo aparezca un mensaje de error (por eso no sirve alinear al centro ni al final). */}
      <div className="acciones-campo">
        <button className="btn" type="submit">Aplicar fechas</button>
        <button className="btn ghost" type="button" onClick={limpiar}>Limpiar fechas</button>
      </div>
    </form>
  );
}
