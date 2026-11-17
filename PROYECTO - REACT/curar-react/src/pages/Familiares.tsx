import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { capitalizarNombre, PATRON_DNI, PATRON_NOMBRE } from '../utils/validacion';

interface FamiliarValores {
  readonly nombre: string;
  readonly parentesco: string;
  readonly dni: string;
  readonly seguro: string;
}
const INICIAL: FamiliarValores = { nombre: '', parentesco: 'Hijo/a', dni: '', seguro: 'SIS' };

/** El DNI es opcional (p. ej. menores sin documento), pero si se escribe debe tener 8 dígitos. */
const dniOpcionalInvalido = (dni: string): boolean => dni.trim() !== '' && !PATRON_DNI.test(dni.trim());

const validar = (v: FamiliarValores): Errores<FamiliarValores> => ({
  nombre: v.nombre.length < 3 || v.nombre.length > 80 || !PATRON_NOMBRE.test(v.nombre),
  dni: dniOpcionalInvalido(v.dni),
});

export function Familiares() {
  const { usuario } = useAuth();
  const { familiares, cargando, guardando, error, cargarFamiliares, agregarFamiliar, quitarFamiliar } = useCitas();
  const form = useFormulario<FamiliarValores>(INICIAL);
  const [aviso, setAviso] = useState('');
  const [errDup, setErrDup] = useState('');
  const [borrando, setBorrando] = useState('');
  const errores = validar(form.valores);
  const invalido = errores.nombre === true || errores.dni === true;
  const dniTitular = usuario?.dni;

  useEffect(() => {
    if (dniTitular) cargarFamiliares(dniTitular);
  }, [dniTitular, cargarFamiliares]);

  async function agregar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    setAviso('');
    setErrDup('');
    if (!usuario || invalido || guardando) return;
    const v = form.valores;
    const dni = v.dni.trim();
    if (dni && (dni === usuario.dni || familiares.some((f) => f.dni === dni))) {
      setErrDup('Ese DNI ya está registrado en tu cuenta.');
      return;
    }
    const r = await agregarFamiliar({ dniTitular: usuario.dni, nombre: capitalizarNombre(v.nombre), parentesco: v.parentesco, dni, seguro: v.seguro });
    if (!r.ok) return;
    form.reiniciar(INICIAL);
    setAviso('Familiar agregado.');
  }

  async function quitar(id: string): Promise<void> {
    if (!id) return;
    const r = await quitarFamiliar(id);
    if (r.ok) setBorrando('');
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mis familiares</h1>
      <p style={{ margin: '6px 0 16px' }}>Registra a tus familiares para reservar citas a su nombre. Para cambiar tus datos ve a <Link to="/cuenta" className="link">Mi cuenta</Link>.</p>
      <p className="err" role="alert">{error}</p>
      {familiares.length === 0 ? (
        <p className="tabla" role="status">{cargando ? 'Cargando…' : 'Aún no registraste familiares.'}</p>
      ) : (
        familiares.map((f) => (
          <article className="tabla" key={f.id ?? f.dni + f.nombre}>
            <b>{f.nombre}</b> <span className="pill">{f.parentesco}</span><br />
            <small>DNI {f.dni || 'sin DNI'} · {f.seguro}</small><br />
            <Link className="btn ghost" style={{ margin: '8px 8px 0 0' }} to="/seguro">Reservar cita</Link>
            {borrando === f.id ? (
              <>
                <button className="btn" type="button" disabled={guardando} onClick={() => void quitar(f.id ?? '')}>Confirmar</button>{' '}
                <button className="btn ghost" type="button" onClick={() => setBorrando('')}>No</button>
              </>
            ) : (
              <button className="btn ghost" style={{ marginTop: 8 }} type="button" onClick={() => setBorrando(f.id ?? '')}>Quitar</button>
            )}
          </article>
        ))
      )}
      <form className="tabla" onSubmit={(e) => void agregar(e)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <h2 style={{ fontSize: 20 }}>Agregar familiar</h2>
        <label>Nombre completo
          <input value={form.valores.nombre} aria-invalid={form.malo(errores, 'nombre')} onChange={(e) => form.cambiar('nombre', e.target.value)} onBlur={() => form.tocar('nombre')} />
        </label>
        <label>Parentesco
          <select value={form.valores.parentesco} onChange={(e) => form.cambiar('parentesco', e.target.value)}>
            <option>Hijo/a</option><option>Cónyuge</option><option>Padre</option><option>Madre</option><option>Hermano/a</option><option>Otro</option>
          </select>
        </label>
        <label>DNI (opcional)
          <input value={form.valores.dni} inputMode="numeric" maxLength={8} aria-invalid={form.malo(errores, 'dni')} onChange={(e) => form.cambiar('dni', e.target.value)} onBlur={() => form.tocar('dni')} />
        </label>
        <label>Seguro
          <select value={form.valores.seguro} onChange={(e) => form.cambiar('seguro', e.target.value)}>
            <option>SIS</option><option>EsSalud</option><option>Particular</option>
          </select>
        </label>
        <p className="err" role="alert">
          {form.intento && invalido && 'Escribe un nombre válido (3+ letras) y, si pones DNI, que tenga 8 dígitos. '}{errDup}
        </p>
        <button className="btn brand" type="submit" disabled={guardando}>Guardar familiar</button>
        <p role="status" aria-live="polite">{aviso}</p>
      </form>
    </section>
  );
}
