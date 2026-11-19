import { useFormContext } from 'react-hook-form';
import type { ConsultaData, ConsultaInput } from '../../model/consulta';
import { Campo } from '../Campo';

/** Sub-formulario: recibe los métodos del formulario por contexto, sin props. */
export function SignosVitalesFields() {
  const { register, formState: { errors } } = useFormContext<ConsultaInput, unknown, ConsultaData>();
  return (
    <section className="co-sec" aria-labelledby="t-vitales">
      <h2 id="t-vitales"><i className="bi bi-heart-pulse" aria-hidden="true" /> Signos vitales <small>(opcional)</small></h2>
      <div className="co-grid">
        <Campo label="Presión arterial (mmHg)" error={errors.presion?.message}>
          {(a11y) => <input placeholder="120/80" inputMode="numeric" {...a11y} {...register('presion')} />}
        </Campo>
        <Campo label="Frecuencia cardíaca (lpm)" error={errors.frecuencia?.message}>
          {(a11y) => <input placeholder="72" inputMode="numeric" {...a11y} {...register('frecuencia')} />}
        </Campo>
      </div>
    </section>
  );
}
