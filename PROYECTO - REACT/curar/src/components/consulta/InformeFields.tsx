import { useFormContext } from 'react-hook-form';
import type { ConsultaData, ConsultaInput } from '../../model/consulta';
import { FieldMessage } from '../FieldMessage';

export function InformeFields() {
  const { register, formState: { errors } } = useFormContext<ConsultaInput, unknown, ConsultaData>();
  return (
    <section className="co-sec" aria-labelledby="t-informe">
      <h2 id="t-informe"><i className="bi bi-journal-medical" aria-hidden="true" /> Informe de atención</h2>
      <label>Síntomas y motivo de consulta
        <textarea rows={3} aria-invalid={Boolean(errors.sintomas)} aria-describedby="sintomas-error" {...register('sintomas')} />
      </label>
      <FieldMessage id="sintomas-error" message={errors.sintomas?.message} />
      <label>Hallazgos del examen
        <textarea rows={3} placeholder="Qué encontró en la evaluación" aria-invalid={Boolean(errors.hallazgos)} aria-describedby="hallazgos-error" {...register('hallazgos')} />
      </label>
      <FieldMessage id="hallazgos-error" message={errors.hallazgos?.message} />
      <label>Diagnóstico
        <input placeholder="Ej. Cefalea tensional" aria-invalid={Boolean(errors.diagnostico)} aria-describedby="diagnostico-error" {...register('diagnostico')} />
      </label>
      <FieldMessage id="diagnostico-error" message={errors.diagnostico?.message} />
      <label>Plan e indicaciones
        <textarea rows={3} placeholder="Tratamiento, controles, recomendaciones" aria-invalid={Boolean(errors.plan)} aria-describedby="plan-error" {...register('plan')} />
      </label>
      <FieldMessage id="plan-error" message={errors.plan?.message} />
    </section>
  );
}
