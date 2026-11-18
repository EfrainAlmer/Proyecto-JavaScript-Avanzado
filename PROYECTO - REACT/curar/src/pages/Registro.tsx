import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { AuthShell } from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { ESPECIALIDADES_REGISTRO, registroInicial, registroSchema, type RegistroData, type RegistroInput } from '../model/auth';
import { mensajeHttp } from '../services/mensajeHttp';
import { ROLE_MEDICO, ROLE_PACIENTE } from '../types/cita';

export function Registro() {
  const auth = useAuth();
  const navigate = useNavigate();
  // `paso` es estado de la pantalla (qué mitad se ve), no un dato del formulario: por eso sí es useState.
  const [paso, setPaso] = useState<1 | 2>(1);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput, unknown, RegistroData>({
    resolver: zodResolver(registroSchema),
    defaultValues: registroInicial(),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Equivale a `valueChanges` del rol: solo re-renderiza cuando cambia el rol.
  const rol = useWatch({ control, name: 'rol' });

  /** Paso 1: valida solo el correo antes de mostrar el resto. */
  async function siguiente(): Promise<void> {
    if (await trigger('correo')) setPaso(2);
  }

  async function crear(data: RegistroData): Promise<void> {
    try {
      // `data` ya viene transformado: nombre capitalizado, correo en minúsculas, DNI sin espacios.
      const { confirmar: _confirmar, ...datos } = data;
      const ok = await auth.registrar(datos);
      if (ok) void navigate('/verificar');
      else setError('root.server', { message: 'Ya existe una cuenta con ese DNI.' });
    } catch (e) {
      setError('root.server', { message: mensajeHttp(e) });
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit(crear)} noValidate>
        {paso === 1 ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 400 }}>Crea una cuenta.</h1>
            <p style={{ color: 'var(--slate-text)', marginBottom: 14 }}>Vamos a ponerte en marcha.</p>
            <div role="group" aria-label="Tipo de cuenta" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" className={`btn${rol === ROLE_PACIENTE ? '' : ' ghost'}`} aria-pressed={rol === ROLE_PACIENTE} onClick={() => setValue('rol', ROLE_PACIENTE)}>Soy paciente</button>
              <button type="button" className={`btn${rol === ROLE_MEDICO ? '' : ' ghost'}`} aria-pressed={rol === ROLE_MEDICO} onClick={() => setValue('rol', ROLE_MEDICO)}>Soy médico</button>
            </div>
            <label>Correo electrónico
              <input type="email" placeholder="nombre@gmail.com" autoComplete="email" aria-invalid={Boolean(errors.correo)} {...register('correo')} />
            </label>
            <p className="err" role="alert">{errors.correo?.message}</p>
            <button className="btn" type="button" onClick={() => void siguiente()} style={{ width: '100%', justifyContent: 'center' }}>Siguiente</button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 400 }}>Completa tus datos</h1>
            <label>DNI<input inputMode="numeric" maxLength={8} aria-invalid={Boolean(errors.dni)} {...register('dni')} /></label>
            <p className="err" role="alert">{errors.dni?.message}</p>
            <label>Nombres y apellidos<input autoComplete="name" aria-invalid={Boolean(errors.nombre)} {...register('nombre')} /></label>
            <p className="err" role="alert">{errors.nombre?.message}</p>
            <label>Celular<input inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" aria-invalid={Boolean(errors.telefono)} {...register('telefono')} /></label>
            <p className="err" role="alert">{errors.telefono?.message}</p>
            {rol === ROLE_MEDICO && (
              <>
                <label>Código CMP (colegiatura)
                  <input inputMode="numeric" maxLength={6} aria-invalid={Boolean(errors.cmp)} {...register('cmp')} />
                </label>
                <p className="err" role="alert">{errors.cmp?.message}</p>
                <label>Especialidad
                  <select {...register('especialidad')}>
                    {ESPECIALIDADES_REGISTRO.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </label>
              </>
            )}
            <label>Contraseña<input type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register('password')} /></label>
            <p className="err" role="alert">{errors.password?.message}</p>
            <label>Repite la contraseña<input type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmar)} {...register('confirmar')} /></label>
            <p className="err" role="alert">{errors.confirmar?.message}</p>
            <button className="btn brand" type="submit" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>{isSubmitting ? 'Creando…' : 'Crear cuenta'}</button>
            <button className="link" type="button" onClick={() => setPaso(1)}>← Cambiar correo</button>
            <p className="err" role="alert">{errors.root?.['server']?.message}</p>
          </>
        )}
        <p style={{ marginTop: 14, fontSize: 14 }}>¿Ya tienes cuenta? <Link to="/login" className="link">Inicia sesión</Link></p>
      </form>
    </AuthShell>
  );
}
