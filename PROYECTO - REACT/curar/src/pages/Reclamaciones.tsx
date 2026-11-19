import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { Campo } from '../components/Campo';
import { FieldMessage } from '../components/FieldMessage';
import { useAuth } from '../context/AuthContext';
import { reclamoInicial, reclamoSchema, SERVICIOS, TIPOS_RECLAMO, type ReclamoData, type ReclamoInput } from '../model/reclamo';
import { useCatalogo } from '../queries/catalogo';
import { useCrearReclamo } from '../queries/cuentas';
import { textoError } from '../services/mensajeHttp';
import { fechaMedia } from '../utils/formato';

export function Reclamaciones() {
  const { usuario } = useAuth();
  const { sedes } = useCatalogo();
  // La hoja registrada ES la respuesta de la mutación: no hace falta guardarla en un useState aparte.
  const crearReclamo = useCrearReclamo();
  const enviado = crearReclamo.data;

  const { register, control, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ReclamoInput, unknown, ReclamoData>({
    resolver: zodResolver(reclamoSchema),
    defaultValues: reclamoInicial(usuario?.nombre, usuario?.dni),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  // El texto explicativo depende del tipo elegido.
  const tipo = useWatch({ control, name: 'tipo' });

  function otro(): void {
    crearReclamo.reset(); // vuelve a mostrar el formulario
    reset(reclamoInicial(usuario?.nombre, usuario?.dni));
  }

  async function enviar(data: ReclamoData): Promise<void> {
    const { sedeId, acepto: _acepto, ...resto } = data;
    const hoy = new Date();
    if (crearReclamo.isPending) return;
    await crearReclamo.mutateAsync({
      ...resto,
      codigo: `LR-${hoy.getFullYear()}-${String(Date.now()).slice(-6)}`,
      sede: sedes.find((s) => s.id === sedeId)?.nombre ?? 'No especificada',
      fecha: hoy.toLocaleDateString('sv-SE'),
      estado: 'Recibido',
    }).catch(() => undefined); // el error queda en crearReclamo.error
  }


  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Libro de Reclamaciones</h1>
      <p style={{ margin: '6px 0 20px' }}>Registra tu reclamo o queja sobre la atención recibida. Al enviarlo obtendrás un código de seguimiento.</p>
      {enviado ? (
        <div className="tabla" role="status" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 22 }}>Hoja de reclamación registrada</h2>
          <p style={{ margin: '12px 0' }}><span className="pill">{enviado.codigo}</span></p>
          <p><b>Tipo:</b> {enviado.tipo} · <b>Fecha:</b> {fechaMedia(enviado.fecha)}</p>
          <p style={{ marginTop: 8 }}>La respuesta se dará al correo que indicaste ({enviado.correo}). Guarda tu código.</p>
          <p style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost" type="button" onClick={otro}>Registrar otro</button>
            <Link className="btn" to="/">Volver al inicio</Link>
          </p>
        </div>
      ) : (
        <form className="tabla" onSubmit={handleSubmit(enviar)} noValidate style={{ maxWidth: 760, display: 'grid', gap: 14 }}>
          <h2 style={{ fontSize: 20 }}>1. Tipo de hoja</h2>
          <div role="group" aria-label="Tipo de hoja" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIPOS_RECLAMO.map((t) => (
              <button key={t} type="button" className={`btn${tipo === t ? '' : ' ghost'}`} aria-pressed={tipo === t} onClick={() => setValue('tipo', t)}>{t}</button>
            ))}
          </div>
          <p className="note" style={{ margin: 0 }}>
            {tipo === 'Reclamo'
              ? 'Reclamo: disconformidad con el servicio de salud recibido.'
              : 'Queja: malestar por la atención al público, sin relación directa con el servicio de salud.'}
          </p>

          <h2 style={{ fontSize: 20, marginTop: 8 }}>2. Datos de quien reclama</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            <Campo label="Nombres y apellidos" error={errors.nombre?.message}>{(a11y) => <input autoComplete="name" {...a11y} {...register('nombre')} />}</Campo>
            <Campo label="DNI" error={errors.dni?.message}>{(a11y) => <input inputMode="numeric" maxLength={8} {...a11y} {...register('dni')} />}</Campo>
            <Campo label="Correo electrónico" error={errors.correo?.message}>{(a11y) => <input type="email" autoComplete="email" {...a11y} {...register('correo')} />}</Campo>
            <Campo label="Celular" error={errors.telefono?.message}>{(a11y) => <input inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" {...a11y} {...register('telefono')} />}</Campo>
            <div style={{ gridColumn: '1/-1' }}><Campo label="Domicilio" error={errors.domicilio?.message}>{(a11y) => <input autoComplete="street-address" {...a11y} {...register('domicilio')} />}</Campo></div>
          </div>

          <h2 style={{ fontSize: 20, marginTop: 8 }}>3. Servicio relacionado</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            <label>Sede
              <select {...register('sedeId')}>
                <option value="">No especificada</option>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label>Servicio
              <select {...register('servicio')}>{SERVICIOS.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
          </div>

          <h2 style={{ fontSize: 20, marginTop: 8 }}>4. Detalle</h2>
          <Campo label="Describe lo ocurrido (mínimo 20 caracteres)" error={errors.detalle?.message}>{(a11y) => <textarea rows={5} maxLength={1000} {...a11y} {...register('detalle')} />}</Campo>
          <Campo label="¿Qué solución esperas? (mínimo 10 caracteres)" error={errors.pedido?.message}>{(a11y) => <textarea rows={3} maxLength={500} {...a11y} {...register('pedido')} />}</Campo>

          <label className="chk">
            <input type="checkbox" aria-invalid={Boolean(errors.acepto)} {...register('acepto')} />
            <span>Declaro que los datos son verdaderos y autorizo su tratamiento para atender este caso, conforme a la Ley 29733.</span>
          </label>
          <FieldMessage id="acepto-error" message={errors.acepto?.message} />
          <p className="note" style={{ margin: 0 }}>La formulación de un reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para presentar una denuncia ante el INDECOPI.</p>

          {crearReclamo.error && <p className="err" role="alert">No se registró la hoja. {textoError(crearReclamo.error)}</p>}
          <button className="btn brand" type="submit" disabled={isSubmitting} style={{ justifySelf: 'start' }}>{isSubmitting ? 'Enviando…' : 'Enviar hoja de reclamación'}</button>
        </form>
      )}
    </section>
  );
}
