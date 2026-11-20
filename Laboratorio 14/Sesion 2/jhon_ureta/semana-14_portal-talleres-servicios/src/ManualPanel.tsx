import { useEffect, useReducer, useRef, useState } from 'react';
import { Panel } from './Panel';
import type { Client } from './http';
import type { Mode, Workshop } from './contract';

type Read = { loading: boolean; data?: Workshop[]; error?: unknown };

export function ManualPanel({ client, mode }: { client: Client; mode: Mode }) {
  const [read, setRead] = useState<Read>({ loading: true });
  const [revision, refresh] = useReducer((n: number) => n + 1, 0);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    let active = true;
    setRead((previous) => ({ loading: true, data: previous.data }));
    void client.list(mode, controller.signal).then(
      (data) => { if (active) setRead({ loading: false, data }); },
      (error: unknown) => {
        if (active) setRead((previous) => ({
          loading: false, data: previous.data, error,
        }));
      },
    );
    return () => {
      active = false;
      controller.abort();
      activeRequest.current = null;
    };
  }, [client, mode, revision]);

  return <Panel
    data={read.data}
    error={read.error}
    loading={read.loading && read.data === undefined}
    refreshing={read.loading && read.data !== undefined}
    canReserve={mode === 'normal'}
    refresh={refresh}
    cancel={() => activeRequest.current?.abort()}
    reserve={async (input) => {
      const receipt = await client.reserve(input);
      refresh();
      return receipt;
    }}
  />;
}
const axiosInstance = axios.create({
  timeout: TIMEOUT,
  responseType: 'json',
  transitional: { silentJSONParsing: false },
});
axiosInstance.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) throw abortError();
  if (axios.isAxiosError(error)) {
    if (error.response && error.response.status >= 400) {
      throw new ApiError('http', error.response.status);
    }
    if (error.cause instanceof SyntaxError) throw new ApiError('format');
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new ApiError('timeout');
    }


    throw new ApiError('network');
  }
  throw error;
});

export const axiosClient: Client = {
  async list(mode, signal) {
    const response = await axiosInstance.get<unknown>(listUrl(mode), { signal });
    return parseWorkshops(response.data);
  },
  async reserve(input) {
    const response = await axiosInstance.post<unknown>(RESERVATIONS, input);
    return parseReceipt(response.data);
  },
};
function xhrJson(url: string, input?: Reservation, signal?: AbortSignal) {
  return new Promise<unknown>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    xhr.open(input ? 'POST' : 'GET', url, true);
    xhr.timeout = TIMEOUT;
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError('http', xhr.status));
        return;
      }
      try {
        resolve(parseJsonText(xhr.responseText));


      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new ApiError('network'));
    xhr.ontimeout = () => reject(new ApiError('timeout'));
    xhr.onabort = () => reject(abortError());
    xhr.onloadend = () => signal?.removeEventListener('abort', cancel);
    if (input) xhr.setRequestHeader('Content-Type', 'application/json');
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      xhr.send(input ? JSON.stringify(input) : null);
    } catch (error) {
      signal?.removeEventListener('abort', cancel);
      reject(error);
    }
  });
}

export const xhrClient: Client = {
  async list(mode, signal) {
    return parseWorkshops(await xhrJson(listUrl(mode), undefined, signal));
  },
  async reserve(input) {
    return parseReceipt(await xhrJson(RESERVATIONS, input));
  },
};
const kyInstance = ky.create({ timeout: TIMEOUT, retry: 0 });
async function kyJson(operation: () => Promise<unknown>, signal?: AbortSignal) {
  try {
    return await operation();
  } catch (error) {
    if (signal?.aborted) throw abortError();
    if (error instanceof HTTPError) throw new ApiError('http', error.response.status);
    if (error instanceof TimeoutError) throw new ApiError('timeout');
    if (error instanceof SyntaxError) throw new ApiError('format');
    throw error;
  }
}

export const kyClient: Client = {
  async list(mode, signal) {
    const run = () => kyInstance.get(listUrl(mode), { signal }).json<unknown>();
    return parseWorkshops(await kyJson(run, signal));
  },
  async reserve(input) {
    const run = () => kyInstance.post(RESERVATIONS, { json: input }).json<unknown>();
    return parseReceipt(await kyJson(run));
  },
};
