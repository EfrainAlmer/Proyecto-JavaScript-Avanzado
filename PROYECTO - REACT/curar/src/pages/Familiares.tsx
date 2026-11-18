import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FieldMessage } from '../components/FieldMessage';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { familiarInicial, familiarSchema, PARENTESCOS, SEGUROS_FAMILIAR, type FamiliarData, type FamiliarInput } from '../model/familiar';

export function Familiares() {
  const { usuario } = useAuth();
  const { familiares, cargando, guardando, error, cargarFamiliares, agregarFamiliar, quitarFamiliar } = useCitas();
  const [aviso, setAviso] = useState('');
  const [borrando, setBorrando] = useState('');
  const dniTitular = usuario?.dni;

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<FamiliarInput, unknown, FamiliarData>({
    resolver: zodResolver(familiarSchema),
    defaultValues: familiarInicial(),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (dniTitular) cargarFamiliares(dniTitular);
  }, [dniTitular, cargarFamiliares]);

  async function agregar(data: FamiliarData): Promise<void> {
    setAviso('');
    if (!usuario) return;
    // Esta regla depende de datos de la API (familiares ya registrados), por eso no está en el esquema.
    if (data.dni && (data.dni === usuario.dni || familiares.some((f) => f.dni === data.dni))) {
      setError('dni', { message: 'Ese DNI ya está registrado en tu cuenta.' });
      return;
    }
    const r = await agregarFamiliar({ dniTitular: usuario.dni, ...data });
    if (!r.ok) return;
    reset(familiarInicial());
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
      <form className="tabla" onSubmit={handleSubmit(agregar)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <h2 style={{ fontSize: 20 }}>Agregar familiar</h2>
        <label>Nombre completo
          <input aria-invalid={Boolean(errors.nombre)} {...register('nombre')} />
        </label>
        <FieldMessage id="nombre-error" message={errors.nombre?.message} />
        <label>Parentesco
          <select {...register('parentesco')}>{PARENTESCOS.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <label>DNI (opcional)
          <input inputMode="numeric" maxLength={8} aria-invalid={Boolean(errors.dni)} {...register('dni')} />
        </label>
        <FieldMessage id="dni-error" message={errors.dni?.message} />
        <label>Seguro
          <select {...register('seguro')}>{SEGUROS_FAMILIAR.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <button className="btn brand" type="submit" disabled={isSubmitting || guardando}>Guardar familiar</button>
        <p role="status" aria-live="polite">{aviso}</p>
      </form>
    </section>
  );
}
