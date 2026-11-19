import { zodResolver } from '@hookform/resolvers/zod';
import { Campo } from '../Campo';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { ESPECIALIDADES, ESTADOS_MEDICO, medicoSchema, type MedicoData, type MedicoInput } from '../../model/medico';
import type { Sede } from '../../types/cita';

interface Opcion {
  readonly value: string;
  readonly label: string;
}

interface MedicoFormProps {
  readonly titulo: string;
  readonly valoresIniciales: MedicoInput;
  readonly sedes: readonly Sede[];
  /** Devuelve un mensaje si el CMP ya existe (regla que depende de datos externos). */
  readonly cmpRepetido: (cmp: string) => string | null;
  readonly onGuardar: (data: MedicoData) => Promise<void>;
  readonly onCancelar: () => void;
}

export function MedicoForm({ titulo, valoresIniciales, sedes, cmpRepetido, onGuardar, onCancelar }: MedicoFormProps) {
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<MedicoInput, unknown, MedicoData>({
    resolver: zodResolver(medicoSchema),
    defaultValues: valoresIniciales,
    mode: 'onBlur',
  });

  // Opciones de react-select: derivadas de las sedes en cada render.
  const opcionesSede: Opcion[] = [{ value: '', label: 'Sin asignar' }, ...sedes.map((s) => ({ value: s.id, label: `${s.nombre} · ${s.tipo}` }))];

  async function enviar(data: MedicoData): Promise<void> {
    const repetido = cmpRepetido(data.cmp);
    if (repetido) {
      setError('cmp', { message: repetido });
      return;
    }
    await onGuardar(data);
  }

  return (
    <form className="tabla" onSubmit={handleSubmit(enviar)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
      <h2 style={{ fontSize: 20 }}>{titulo}</h2>
      <Campo label="Nombre completo" error={errors.nombre?.message}>{(a11y) => <input {...a11y} {...register('nombre')} />}</Campo>
      <label>Especialidad
        <select {...register('especialidad')}>{ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}</select>
      </label>
      <Campo label="Código CMP (solo se valida el formato)" error={errors.cmp?.message}>{(a11y) => <input inputMode="numeric" maxLength={6} {...a11y} {...register('cmp')} />}</Campo>

      {/* Componente externo: no acepta {...register()}, así que se conecta con Controller. */}
      <label htmlFor="medico-sede">Sede</label>
      <Controller
        name="sedeId"
        control={control}
        render={({ field }) => (
          <Select<Opcion, false>
            inputId="medico-sede"
            name={field.name}
            options={opcionesSede}
            isSearchable
            placeholder="Busca una sede…"
            noOptionsMessage={() => 'Sin coincidencias'}
            isDisabled={isSubmitting}
            value={opcionesSede.find((o) => o.value === field.value) ?? null}
            onChange={(opcion) => field.onChange(opcion?.value ?? '')}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />

      <label>Estado
        <select {...register('estado')}>{ESTADOS_MEDICO.map((e) => <option key={e}>{e}</option>)}</select>
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn brand" type="submit" disabled={isSubmitting}>Guardar</button>
        <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
