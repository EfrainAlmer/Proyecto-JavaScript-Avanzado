import { useFieldArray, useFormContext } from 'react-hook-form';
import { MEDICAMENTO_VACIO, type ConsultaData, type ConsultaInput } from '../../model/consulta';
import { FieldMessage } from '../FieldMessage';

const MAXIMO = 10;

/** Equivale al FormArray de Angular: filas de medicamentos que se añaden y quitan. */
export function RecetasFields() {
  const { control, register, formState: { errors } } = useFormContext<ConsultaInput, unknown, ConsultaData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'recetas' });

  return (
    <section className="co-sec" aria-labelledby="t-receta">
      <h2 id="t-receta"><i className="bi bi-prescription2" aria-hidden="true" /> Receta médica <small>(opcional)</small></h2>
      {fields.length === 0 && <p className="co-vacio">Sin medicamentos. Agrega uno si el paciente necesita receta.</p>}
      {fields.map((field, index) => {
        const e = errors.recetas?.[index];
        return (
          // field.id es estable aunque se borren filas; el índice no lo es.
          <div className="co-med" key={field.id}>
            <div>
              <label>Medicamento {index + 1}
                <input placeholder="Ej. Paracetamol 500 mg" aria-invalid={Boolean(e?.medicamento)} {...register(`recetas.${index}.medicamento` as const)} />
              </label>
              <FieldMessage id={`${field.id}-medicamento-error`} message={e?.medicamento?.message} />
            </div>
            <div>
              <label>Cantidad (envases)
                <input inputMode="numeric" aria-invalid={Boolean(e?.cantidad)} {...register(`recetas.${index}.cantidad` as const)} />
              </label>
              <FieldMessage id={`${field.id}-cantidad-error`} message={e?.cantidad?.message} />
            </div>
            <div className="co-ind">
              <label>Indicaciones
                <input placeholder="Ej. Una tableta cada 8 horas por 3 días" aria-invalid={Boolean(e?.indicaciones)} {...register(`recetas.${index}.indicaciones` as const)} />
              </label>
              <FieldMessage id={`${field.id}-indicaciones-error`} message={e?.indicaciones?.message} />
            </div>
            <button type="button" className="btn ghost co-quitar" aria-label={`Quitar medicamento ${index + 1}`} onClick={() => remove(index)}>
              <i className="bi bi-trash" aria-hidden="true" /> Quitar
            </button>
          </div>
        );
      })}
      <FieldMessage id="recetas-error" message={errors.recetas?.root?.message ?? errors.recetas?.message} />
      <button type="button" className="btn ghost co-pill" disabled={fields.length >= MAXIMO} onClick={() => append({ ...MEDICAMENTO_VACIO })}>
        <i className="bi bi-plus-lg" aria-hidden="true" /> Agregar medicamento
      </button>
    </section>
  );
}
