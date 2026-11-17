import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useCarga } from '../hooks/useCarga';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { curarApi } from '../services/curarApi';
import type { Reclamo, TipoReclamo } from '../types/cita';
import { capitalizarNombre, PATRON_CORREO, PATRON_DNI, PATRON_NOMBRE, PATRON_TELEFONO } from '../utils/validacion';

const TIPOS: readonly TipoReclamo[] = ['Reclamo', 'Queja'];

interface ReclamoValores {
  readonly nombre: string;
  readonly dni: string;
  readonly correo: string;
  readonly telefono: string;
  readonly domicilio: string;
  readonly sedeId: string;
  readonly servicio: string;
  readonly detalle: string;
  readonly pedido: string;
  readonly acepto: boolean;
}

const base = (nombre = '', dni = ''): ReclamoValores => ({
  nombre, dni, correo: '', telefono: '', domicilio: '', sedeId: '', servicio: 'Consulta médica', detalle: '', pedido: '', acepto: false,
});

const validar = (v: ReclamoValores): Errores<ReclamoValores> => ({
  nombre: v.nombre.length < 3 || v.nombre.length > 80 || !PATRON_NOMBRE.test(v.nombre),
  dni: !PATRON_DNI.test(v.dni),
  correo: !PATRON_CORREO.test(v.correo),
  telefono: !PATRON_TELEFONO.test(v.telefono),
  domicilio: v.domicilio.length < 5 || v.domicilio.length > 120,
  detalle: v.detalle.length < 20 || v.detalle.length > 1000,
  pedido: v.pedido.length < 10 || v.pedido.length > 500,
  acepto: !v.acepto,
});

export function Reclamaciones() {
  const { usuario } = useAuth();
  const { sedes, cargarSedes } = useCitas();
  const { cargando, error, ejecutar } = useCarga();
  const [tipo, setTipo] = useState<TipoReclamo>('Reclamo');
  const [enviado, setEnviado] = useState<Reclamo | null>(null);
  const form = useFormulario<ReclamoValores>(base(usuario?.nombre, usuario?.dni));
  const v = form.valores;
  const errores = validar(v);
  const invalido = Object.values(errores).some(Boolean);

  useEffect(() => {
    cargarSedes();
  }, [cargarSedes]);

  function texto(campo: 'nombre' | 'dni' | 'correo' | 'telefono' | 'domicilio') {
    return {
      value: v[campo],
      'aria-invalid': form.malo(errores, campo),
      onChange: (e: { target: { value: string } }) => form.cambiar(campo, e.target.value),
      onBlur: () => form.tocar(campo),
    };
  }

  function otro(): void {
    setEnviado(null);
    form.reiniciar(base(usuario?.nombre, usuario?.dni));
  }

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    if (invalido || cargando) return;
    const sede = sedes.find((s) => s.id === v.sedeId)?.nombre ?? 'No especificada';
    const hoy = new Date();
    const reclamo: Reclamo = {
      codigo: `LR-${hoy.getFullYear()}-${String(Date.now()).slice(-6)}`, tipo, nombre: capitalizarNombre(v.nombre), dni: v.dni,
      correo: v.correo.trim().toLowerCase(), telefono: v.telefono, domicilio: v.domicilio.trim(), sede, servicio: v.servicio,
      detalle: v.detalle.trim(), pedido: v.pedido.trim(), fecha: hoy.toLocaleDateString('sv-SE'), estado: 'Recibido',
    };
    const r = await ejecutar(curarApi.crearReclamo(reclamo));
    if (r.ok) setEnviado(r.valor);
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Libro de Reclamaciones</h1>
      <p style={{ margin: '6px 0 20px' }}>Registra tu reclamo o queja sobre la atención recibida. Al enviarlo obtendrás un código de seguimiento.</p>
      {enviado ? (
        <div className="tabla" role="status" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 22 }}>Hoja de reclamación registrada</h2>
          <p style={{ margin: '12px 0' }}><span className="pill">{enviado.codigo}</span></p>
          <p><b>Tipo:</b> {enviado.tipo} · <b>Fecha:</b> {enviado.fecha}</p>
          <p style={{ marginTop: 8 }}>La respuesta se dará al correo que indicaste ({enviado.correo}). Guarda tu código.</p>
          <p style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost" type="button" onClick={otro}>Registrar otro</button>
            <Link className="btn" to="/">Volver al inicio</Link>
          </p>
        </div>
      ) : (
        <form className="tabla" onSubmit={(e) => void enviar(e)} noValidate style={{ maxWidth: 760, display: 'grid', gap: 14 }}>
          <h2 style={{ fontSize: 20 }}>1. Tipo de hoja</h2>
          <div role="group" aria-label="Tipo de hoja" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIPOS.map((t) => (
              <button key={t} type="button" className={`btn${tipo === t ? '' : ' ghost'}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t}</button>
            ))}
          </div>
          <p className="note" style={{ margin: 0 }}>
            {tipo === 'Reclamo'
              ? 'Reclamo: disconformidad con el servicio de salud recibido.'
              : 'Queja: malestar por la atención al público, sin relación directa con el servicio de salud.'}
          </p>

          <h2 style={{ fontSize: 20, marginTop: 8 }}>2. Datos de quien reclama</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            <label>Nombres y apellidos<input autoComplete="name" {...texto('nombre')} /></label>
            <label>DNI<input inputMode="numeric" maxLength={8} {...texto('dni')} /></label>
            <label>Correo electrónico<input type="email" autoComplete="email" {...texto('correo')} /></label>
            <label>Celular<input inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" {...texto('telefono')} /></label>
            <label style={{ gridColumn: '1/-1' }}>Domicilio<input autoComplete="street-address" {...texto('domicilio')} /></label>
          </div>

          <h2 style={{ fontSize: 20, marginTop: 8 }}>3. Servicio relacionado</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            <label>Sede
              <select value={v.sedeId} onChange={(e) => form.cambiar('sedeId', e.target.value)}>
                <option value="">No especificada</option>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label>Servicio
              <select value={v.servicio} onChange={(e) => form.cambiar('servicio', e.target.value)}>
                <option>Consulta médica</option><option>Reserva de citas en línea</option><option>Admisión y atención administrativa</option><option>Farmacia</option><option>Otro</option>
              </select>
            </label>
          </div>

          <h2 style={{ fontSize: 20, marginTop: 8 }}>4. Detalle</h2>
          <label>Describe lo ocurrido (mínimo 20 caracteres)
            <textarea rows={5} maxLength={1000} value={v.detalle} aria-invalid={form.malo(errores, 'detalle')} onChange={(e) => form.cambiar('detalle', e.target.value)} onBlur={() => form.tocar('detalle')} />
          </label>
          <label>¿Qué solución esperas? (mínimo 10 caracteres)
            <textarea rows={3} maxLength={500} value={v.pedido} aria-invalid={form.malo(errores, 'pedido')} onChange={(e) => form.cambiar('pedido', e.target.value)} onBlur={() => form.tocar('pedido')} />
          </label>

          <label className="chk">
            <input type="checkbox" checked={v.acepto} aria-invalid={form.malo(errores, 'acepto')} onChange={(e) => form.cambiar('acepto', e.target.checked)} onBlur={() => form.tocar('acepto')} />
            <span>Declaro que los datos son verdaderos y autorizo su tratamiento para atender este caso, conforme a la Ley 29733.</span>
          </label>
          <p className="note" style={{ margin: 0 }}>La formulación de un reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para presentar una denuncia ante el INDECOPI.</p>

          <p className="err" role="alert">
            {form.intento && invalido && 'Revisa los campos marcados en rojo: DNI de 8 dígitos, celular de 9 dígitos que empiece con 9, correo válido, detalle de al menos 20 caracteres y la declaración aceptada. '}{error}
          </p>
          <button className="btn brand" type="submit" disabled={cargando} style={{ justifySelf: 'start' }}>{cargando ? 'Enviando…' : 'Enviar hoja de reclamación'}</button>
        </form>
      )}
    </section>
  );
}
