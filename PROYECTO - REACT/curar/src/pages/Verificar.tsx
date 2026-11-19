import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { AuthShell } from '../components/AuthShell';
import { CODIGO_DEMO, useAuth } from '../context/AuthContext';
import { verificarSchema, type VerificarData, type VerificarInput } from '../model/auth';
import { mensajeHttp } from '../services/mensajeHttp';

export function Verificar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [aviso, setAviso] = useState('');
  const { pendiente } = auth;
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<VerificarInput, unknown, VerificarData>({
    resolver: zodResolver(verificarSchema),
    defaultValues: { codigo: '' },
  });

  useEffect(() => {
    if (!pendiente()) void navigate('/login', { replace: true });
  }, [pendiente, navigate]);

  async function confirmar({ codigo }: VerificarData): Promise<void> {
    try {
      if (await auth.verificar(codigo)) void navigate(auth.inicio());
      else setError('codigo', { message: 'Código incorrecto.' });
    } catch (e) {
      setError('root.server', { message: mensajeHttp(e) });
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit(confirmar)} noValidate>
        <h1>Verifica tu correo</h1>
        <p style={{ color: 'var(--slate-text)', marginBottom: 14 }}>Escribe el código de 6 dígitos. <b>Modo demostración:</b> el código es {CODIGO_DEMO}.</p>
        <label>Código de verificación
          <input inputMode="numeric" maxLength={6} autoComplete="one-time-code" aria-invalid={Boolean(errors.codigo)} {...register('codigo')} />
        </label>
        <p className="err" role="alert">{errors.codigo?.message ?? errors.root?.['server']?.message}</p>
        <button className="btn brand" type="submit" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>{isSubmitting ? 'Verificando…' : 'Verificar'}</button>
        <button className="link" type="button" onClick={() => setAviso('Código reenviado (simulado).')}>Reenviar código</button>
        <p role="status" aria-live="polite">{aviso}</p>
      </form>
    </AuthShell>
  );
}
