import { useFormContext } from 'react-hook-form';
import type { ConsultaData, ConsultaInput } from '../../model/consulta';
import { FieldMessage } from '../FieldMessage';

/** Sub-formulario: recibe los métodos del formulario por contexto, sin props. */
export function SignosVitalesFields() {
  const { register, formState: { errors } } = useFormContext<ConsultaInput, unknown, ConsultaData>();
  return (
    <section className="co-sec" aria-labelledby="t-vitales">
      <h2 id="t-vitales"><i className="bi bi-heart-pulse" aria-hidden="true" /> Signos vitales <small>(opcional)</small></h2>
      <div className="co-grid">
        <div>
          <label>Presión arterial (mmHg)
            <input placeholder="120/80" inputMode="numeric" aria-invalid={Boolean(errors.presion)} aria-describedby="presion-error" {...register('presion')} />
          </label>
          <FieldMessage id="presion-error" message={errors.presion?.message} />
        </div>
        <div>
          <label>Frecuencia cardíaca (lpm)
            <input placeholder="72" inputMode="numeric" aria-invalid={Boolean(errors.frecuencia)} aria-describedby="frecuencia-error" {...register('frecuencia')} />
          </label>
          <FieldMessage id="frecuencia-error" message={errors.frecuencia?.message} />
        </div>
      </div>
    </section>
  );
}
