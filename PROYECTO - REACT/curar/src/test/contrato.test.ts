import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import base from '../../api/base.json';
import { ApiError, citaSchema, comentarioSchema, medicoSchema, mensajeSchema, recetaSchema, reclamoSchema, sedeSchema, TIMEOUT, usuarioSchema,
} from '../services/contract';
import { curarApi } from '../services/curarApi';
import { http } from '../services/http';
import { mensajeHttp } from '../services/mensajeHttp';

const responder = (cuerpo: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(cuerpo === undefined ? '' : JSON.stringify(cuerpo), { status }))));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('contrato y transporte (Lab 14)', () => {
  it('usa el prefijo /api del proxy, no la URL de json-server', async () => {
    responder([]);
    await curarApi.sedes();
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/sedes');
  });

  it('un 200 OK con datos fuera del contrato lanza ApiError("format")', async () => {
    responder([{ id: 'm1', nombre: 'Ana', calificacion: 'alta' }]); // faltan campos y calificacion no es número
    await expect(curarApi.medicos()).rejects.toMatchObject({ name: 'ApiError', kind: 'format' });
  });

  it('un JSON roto también es un fallo de formato', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{', { status: 200 }))));
    await expect(http('GET', '/api/x')).rejects.toMatchObject({ kind: 'format' });
  });

  it('distingue error HTTP, red caída y cancelación', async () => {
    responder({ message: 'Fallo' }, 503);
    await expect(http('GET', '/api/x')).rejects.toMatchObject({ kind: 'http', status: 503 });

    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(http('GET', '/api/x')).rejects.toMatchObject({ kind: 'network' });

    const control = new AbortController();
    vi.stubGlobal('fetch', vi.fn((_u: string, init?: RequestInit) => new Promise((_ok, falla) => {
      init?.signal?.addEventListener('abort', () => falla(new DOMException('abortado', 'AbortError')));
    })));
    const pendiente = http('GET', '/api/x', undefined, control.signal);
    control.abort();
    await expect(pendiente).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('si la API no responde a tiempo, lanza ApiError("timeout")', async () => {
    // Se sustituye el temporizador de AbortSignal.timeout por uno que controlamos (no esperamos 6 s reales).
    const limite = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(limite.signal);
    vi.stubGlobal('fetch', vi.fn((_u: string, init?: RequestInit) => new Promise((_ok, falla) => {
      init?.signal?.addEventListener('abort', () => falla(new DOMException('tiempo', 'TimeoutError')));
    })));
    const pendiente = http('GET', '/api/x');
    limite.abort();
    await expect(pendiente).rejects.toMatchObject({ kind: 'timeout' });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(TIMEOUT);
  });

  it('traduce cada tipo de fallo a un mensaje distinto', () => {
    expect(mensajeHttp(new ApiError('format'))).toMatch(/contrato/u);
    expect(mensajeHttp(new ApiError('timeout'))).toMatch(/tardó demasiado/u);
    expect(mensajeHttp(new ApiError('network'))).toMatch(/No se pudo contactar/u);
    expect(mensajeHttp(new ApiError('http', 503))).toBe('La API falló. Intenta más tarde.');
    expect(mensajeHttp(new DOMException('x', 'AbortError'))).toMatch(/cancelada/u);
  });

  it('los datos de api/base.json cumplen el contrato (si alguien edita el JSON a mano, esta prueba avisa)', () => {
    const colecciones = [
      [medicoSchema, base.medicos], [citaSchema, base.citas], [sedeSchema, base.sedes], [usuarioSchema, base.usuarios],
      [recetaSchema, base.recetas], [mensajeSchema, base.mensajes], [comentarioSchema, base.comentarios], [reclamoSchema, base.reclamos],
    ] as const;
    for (const [esquema, datos] of colecciones) expect(z.array(esquema as z.ZodType).safeParse(datos).success).toBe(true);
  });
});

