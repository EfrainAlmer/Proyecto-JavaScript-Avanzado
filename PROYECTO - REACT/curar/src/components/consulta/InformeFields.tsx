import { useFormContext } from 'react-hook-form';
import { Campo } from '../Campo';
import type { ConsultaData, ConsultaInput } from '../../model/consulta';

export function InformeFields() {
  const { register, formState: { errors } } = useFormContext<ConsultaInput, unknown, ConsultaData>();
  return (
    <section className="co-sec" aria-labelledby="t-informe">
      <h2 id="t-informe"><i className="bi bi-journal-medical" aria-hidden="true" /> Informe de atención</h2>
      <Campo label="Síntomas y motivo de consulta" error={errors.sintomas?.message}>{(a11y) => <textarea rows={3} {...a11y} {...register('sintomas')} />}</Campo>
      <Campo label="Hallazgos del examen" error={errors.hallazgos?.message}>{(a11y) => <textarea rows={3} placeholder="Qué encontró en la evaluación" {...a11y} {...register('hallazgos')} />}</Campo>
      <Campo label="Diagnóstico" error={errors.diagnostico?.message}>{(a11y) => <input placeholder="Ej. Cefalea tensional" {...a11y} {...register('diagnostico')} />}</Campo>
      <Campo label="Plan e indicaciones" error={errors.plan?.message}>{(a11y) => <textarea rows={3} placeholder="Tratamiento, controles, recomendaciones" {...a11y} {...register('plan')} />}</Campo>
    </section>
  );
}
