import { zodResolver } from '@hookform/resolvers/zod';
import { Campo } from '../components/Campo';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArticuloEstado } from '../components/ArticuloEstado';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { MEDICAMENTO_VACIO, medicamentoSchema, type MedicamentoData, type MedicamentoInput } from '../model/consulta';
import { curarApi } from '../services/curarApi';
import type { Cita, EstadoCita } from '../types/cita';

export function Agenda() {
  const { usuario } = useAuth();
  const { cargando, error, setError, ejecutar } = useCarga();
  const [citas, setCitas] = useState<readonly Cita[]>([]);
  const [receta, setReceta] = useState<Cita | null>(null);
  const [aviso, setAviso] = useState('');
  // Reutiliza el esquema de un medicamento de la consulta: mismas reglas, un solo lugar.
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MedicamentoInput, unknown, MedicamentoData>({
    resolver: zodResolver(medicamentoSchema),
    defaultValues: { ...MEDICAMENTO_VACIO },
    mode: 'onBlur',
  });
  const medicoId = usuario?.medicoId;

  useEffect(() => {
    if (!medicoId) {
      setError('Tu cuenta no tiene un perfil médico asociado.');
      return;
    }
    void ejecutar(curarApi.citasDeMedico(medicoId)).then((r) => r.ok && setCitas(r.valor));
  }, [medicoId, ejecutar, setError]);

  const pendientes = citas.filter((c) => c.estado === 'Pendiente').length;

  async function cambiar(c: Cita, estado: EstadoCita): Promise<void> {
    if (cargando) return;
    const r = await ejecutar(curarApi.cambiarEstado(c.id, estado));
    if (r.ok) setCitas((l) => l.map((x) => (x.id === c.id ? r.valor : x)));
  }

  async function emitir(c: Cita, data: MedicamentoData): Promise<void> {
    setAviso('');
    if (!usuario) return;
    const r = await ejecutar(curarApi.crearReceta({
      dniPaciente: c.dniPaciente, paciente: c.paciente ?? '', medicoId: c.medicoId, medicoNombre: usuario.nombre,
      fecha: new Date().toISOString().slice(0, 10), ...data,
    }));
    if (!r.ok) return;
    setAviso('Receta emitida.');
    setReceta(null);
    reset({ ...MEDICAMENTO_VACIO });
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mi agenda</h1>
      <p role="status" aria-live="polite">{pendientes} citas pendientes de {citas.length}.</p>
      <p className="err" role="alert">{error}</p>
      {cargando && <p role="status">Cargando…</p>}
      {citas.map((c) => (
        <ArticuloEstado key={c.id} estado={c.estado}>
          <b>{c.fecha} · {c.hora}</b> — {c.paciente ?? 'Paciente'} · DNI {c.dniPaciente} · {c.seguro} <small>· Motivo: {c.motivo ?? 'No indicado'}</small>{' '}
          <span className="pill" data-estado={c.estado}>{c.estado}</span>
          {c.estado === 'Pendiente' && <button className="btn" type="button" disabled={cargando} onClick={() => void cambiar(c, 'Confirmada')}>Confirmar</button>}
          {(c.estado === 'Pendiente' || c.estado === 'Confirmada') && <button className="btn ghost" type="button" disabled={cargando} onClick={() => void cambiar(c, 'Cancelada')}>Cancelar</button>}
          {(c.estado === 'Confirmada' || c.estado === 'Atendida') && <button className="btn ghost" type="button" onClick={() => setReceta(c)}>Emitir receta</button>}
        </ArticuloEstado>
      ))}
      {citas.length === 0 && !cargando && <p className="tabla" role="status">No tienes citas programadas.</p>}
      {receta && (
        <form className="tabla" onSubmit={handleSubmit((data) => emitir(receta, data))} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          <h2 style={{ fontSize: 20 }}>Receta para el DNI {receta.dniPaciente}</h2>
          <Campo label="Medicamento" error={errors.medicamento?.message}>{(a11y) => <input {...a11y} {...register('medicamento')} />}</Campo>
          <Campo label="Cantidad (envases)" error={errors.cantidad?.message}>{(a11y) => <input inputMode="numeric" {...a11y} {...register('cantidad')} />}</Campo>
          <Campo label="Indicaciones" error={errors.indicaciones?.message}>{(a11y) => <input {...a11y} {...register('indicaciones')} />}</Campo>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn brand" type="submit" disabled={isSubmitting}>Guardar receta</button>
            <button className="btn ghost" type="button" onClick={() => setReceta(null)}>Cancelar</button>
          </div>
        </form>
      )}
      <p role="status" aria-live="polite">{aviso}</p>
    </section>
  );
}
