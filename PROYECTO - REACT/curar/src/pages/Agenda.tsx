import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArticuloEstado } from '../components/ArticuloEstado';
import { Campo } from '../components/Campo';
import { useAuth } from '../context/AuthContext';
import { useCandado } from '../hooks/useCandado';
import { MEDICAMENTO_VACIO, medicamentoSchema, type MedicamentoData, type MedicamentoInput } from '../model/consulta';
import { useCitasMedico, useCambiarEstadoCita, useCrearReceta } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';
import type { Cita, EstadoCita } from '../types/cita';

export function Agenda() {
  const { usuario } = useAuth();
  const [receta, setReceta] = useState<Cita | null>(null);
  const [aviso, setAviso] = useState('');
  // Reutiliza el esquema de un medicamento de la consulta: mismas reglas, un solo lugar.
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MedicamentoInput, unknown, MedicamentoData>({
    resolver: zodResolver(medicamentoSchema),
    defaultValues: { ...MEDICAMENTO_VACIO },
    mode: 'onBlur',
  });
  const medicoId = usuario?.medicoId;
  // Misma clave que el panel médico (['citas', 'medico', id]): comparten caché y se actualizan juntos.
  const lectura = useCitasMedico(medicoId);
  const cambiarEstado = useCambiarEstadoCita();
  const crearReceta = useCrearReceta();
  const conCandado = useCandado();
  const citas = lectura.data ?? [];
  const cargando = lectura.isLoading || cambiarEstado.isPending;
  const error = !medicoId ? 'Tu cuenta no tiene un perfil médico asociado.' : textoError(lectura.error ?? cambiarEstado.error ?? crearReceta.error);

  const pendientes = citas.filter((c) => c.estado === 'Pendiente').length;

  async function cambiar(c: Cita, estado: EstadoCita): Promise<void> {
    await conCandado(() => cambiarEstado.mutateAsync({ id: c.id, estado })).catch(() => undefined);
  }

  async function emitir(c: Cita, data: MedicamentoData): Promise<void> {
    setAviso('');
    if (!usuario) return;
    try {
      await crearReceta.mutateAsync({
        dniPaciente: c.dniPaciente, paciente: c.paciente ?? '', medicoId: c.medicoId, medicoNombre: usuario.nombre,
        fecha: new Date().toISOString().slice(0, 10), ...data,
      });
      setAviso('Receta emitida.');
      setReceta(null);
      reset({ ...MEDICAMENTO_VACIO });
    } catch {
      // crearReceta.error se muestra arriba; el formulario conserva lo escrito.
    }
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
