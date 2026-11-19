# Curar · React 19 + TypeScript + Vite

Migración del proyecto Angular `curar` (reserva de citas EsSalud/SIS con roles paciente, médico y administrador) a React, integrando los laboratorios 11, 12, 13 y 14.

## Puesta en marcha

Se necesitan **dos terminales**:

```bash
npm install          # .npmrc fija legacy-peer-deps
npm run api          # terminal 1: json-server en http://127.0.0.1:3000 (api/db.json)
npm run dev          # terminal 2: Vite en http://127.0.0.1:5173 (proxy /api → :3000)
```

| Script | Qué hace |
| --- | --- |
| `npm run verify` | `tsc -b` + `vite build` + `vitest run` (115 pruebas) |
| `npm run datos` | Regenera `api/seed.json` y `api/db.json` (125 médicos, ~3000 citas, semilla fija 2026) |
| `npm run reset` | Copia `seed.json` sobre `db.json` y descarta lo creado al probar. **Ejecutar antes de cada commit.** |

Cuentas de prueba (contraseñas en `api/db.json`): paciente DNI `12345678`, médico `87654321`, administrador `11112222`. Código de verificación de demostración: `123456`.

Las pruebas no dependen de `db.json`: usan `api/base.json`, que tiene datos fijos.

## Arquitectura por laboratorio

### Lab 11 · Componentes y UI
- Componentes funcionales con props `readonly`. El estado es mínimo y las listas filtradas se derivan en el render.
- Bootstrap 5 + `styles.css`, con foco visible y `role="alert"` en los errores.

### Lab 12 · Rutas y formularios
- react-router 8 declarativo (`BrowserRouter`, `Routes`, `Route`, `Outlet`). Las rutas privadas usan `<RutaProtegida permiso>` como ruta de layout.
- react-hook-form + Zod (`src/model/*.ts`). El estado del formulario no se duplica en `useState`.

| Concepto | Dónde |
| --- | --- |
| `FormProvider` / `useFormContext` | `pages/Consulta.tsx` → `components/consulta/*Fields.tsx` |
| `useFieldArray` | `components/consulta/RecetasFields.tsx` |
| `Controller` + react-select | `components/admin/MedicoForm.tsx` |
| `useWatch` | `Reservar`, `Registro`, `Reclamaciones` |
| Regla entre campos `fechaInicio`/`fechaFin` (reto obligatorio) | `model/rango.ts` + `components/FiltroFechas.tsx`, en `Historial` |

**Reto obligatorio, rango de fechas.** Se comparan fechas de calendario sin hora en formato `AAAA-MM-DD`, el que entrega `<input type="date">`, como texto. En ese formato el orden alfabético coincide con el cronológico. No se usa `new Date('AAAA-MM-DD')` porque se interpreta en UTC y en Lima cae en el día anterior. El mismo día es un rango válido. Si la fecha final es anterior a la de inicio, el error se asocia a `fechaFin`. Las dos fechas son obligatorias para aplicar el filtro, y *Limpiar fechas* lo quita (`reset`). El padre solo recibe datos ya validados. Pruebas en `test/rango.schema.test.ts`: rango correcto, mismo día, rango invertido y fecha vacía; además hay una prueba de interfaz en `humo.test.tsx`.

### Lab 13 · Hooks de React 19

| Hook | Dónde | Por qué |
| --- | --- | --- |
| `useContext` con `<Ctx value>` | `AuthContext`, `FlujoContext` | Sesión y flujo de reserva compartidos |
| `useReducer` | `components/admin/adminReducer.ts` | Estado de UI del panel admin; sus acciones cambian varias piezas a la vez |
| `useEffect` + `useEffectEvent` | `Home` (carrusel), `PanelMedico` (refresco de agenda) | Temporizadores que leen el último estado sin reiniciarse |
| `useRef` + `useId` | `Campo.tsx`, `useCandado.ts`, `Layout.tsx` | Asociación label/error, candado anti doble envío, foco al navegar |
| `useMemo` / `memo` / `useCallback` | `SupervisionCitas.tsx` | Tabla de 3000 citas con filas memorizadas |
| `useTransition` / `useDeferredValue` | `Admin`, `SupervisionCitas`, `PanelMedico` | Pestañas y filtros sin bloquear la escritura |
| `use()` + `Suspense` + `LimiteError` | `pages/Recetas.tsx` | Lee una promesa de la caché (`ensureQueryData`) |
| `useOptimistic` | `components/BotonFavorito.tsx` | Muestra la estrella marcada antes de que responda la API |
| `useSyncExternalStore` + `useDebugValue` | `hooks/useConexion.ts` → aviso en `Layout` | `navigator.onLine` es una fuente externa que cambia sola; el valor aparece etiquetado en React DevTools |
| `useLayoutEffect` | `components/Layout.tsx` | Mide la cabecera fija y ajusta `scroll-padding-top` para que el campo enfocado con Tab no quede tapado (WCAG 2.4.11) |

**Hooks del PDF que no se usan en Curar, y por qué.** Solo se incluye un hook cuando resuelve algo real en el proyecto:
- `useImperativeHandle`: ningún componente necesita exponer una API imperativa reducida. En React 19, `ref` llega como prop y basta con pasarla al elemento del DOM.
- `useActionState` / `useFormStatus`: todos los formularios usan react-hook-form + Zod (Lab 12), y las escrituras usan `useMutation` (Lab 14). Añadir Actions duplicaría el estado de "pendiente" y de error del mismo envío.
- `useInsertionEffect`: React lo documenta para autores de librerías CSS-in-JS. Curar usa Bootstrap y CSS estático.

**Estado, derivado y fuente externa (evidencia 3 del Lab 13).**

| Tipo | Ejemplos en Curar | Dónde vive |
| --- | --- | --- |
| Estado de interfaz | Pestaña, formulario abierto y aviso del admin; filtros de `Historial`; elección del carrusel | `useReducer` (`adminReducer`) o `useState` en el componente que lo posee |
| Estado de formulario | Campos, errores y envío pendiente | react-hook-form; no se copia en `useState` |
| Estado compartido | Sesión; seguro, sede y especialidad del flujo de reserva | `AuthContext` (+ `localStorage`) y `FlujoContext` |
| Derivado (se calcula en el render) | Médicos visibles, citas filtradas y ordenadas, contadores del admin, historial unificado, horas libres | Expresiones o `useMemo`; nunca `useState` + `useEffect` |
| Fuente externa: servidor | Médicos, citas, recetas, usuarios, reclamos… | Caché de TanStack Query (Lab 14) |
| Fuente externa: navegador | Conectividad (`navigator.onLine`) | `useSyncExternalStore` |
| Referencias (no generan render) | Nodo de `main` y de la cabecera, candado anti doble envío, contador de peticiones de `Recetas` | `useRef` |

### Lab 14 · Servicios REST y estado remoto

```
UI (pages)  →  queries/*.ts (TanStack Query)  →  services/curarApi.ts  →  services/http.ts (fetch)  →  /api (proxy Vite)  →  json-server
                     ↑ claves en queries/claves.ts                ↑ valida con Zod (services/contract.ts)
```

- **Contrato:** toda respuesta entra como `unknown` y se valida con Zod. Un 200 con forma inválida lanza `ApiError('format')`.
- **Transporte único:** `http.ts` sobre Fetch, con `AbortSignal.any([señal de TanStack, AbortSignal.timeout(6000)])`. Los errores se clasifican en `network`, `timeout`, `http` y `format`, y `mensajeHttp.ts` los traduce a textos para el usuario.
- **Estado remoto:** solo TanStack Query, con una sola caché por recurso. No hay SWR, Alova, Ky, Axios ni XHR.
- **Claves jerárquicas:** `['medicos']` ⊃ `['medicos', id]`, y `['citas']` ⊃ `['citas', 'paciente', dni]`, `['citas', 'detalle', id]`… Una mutación invalida el prefijo y se actualizan todas las vistas afectadas.
- **Proxy** en `vite.config.ts`: `/api` → `127.0.0.1:3000`, quitando el prefijo `/api`.

Reglas de resiliencia del md:

| Regla | Implementación |
| --- | --- |
| Separar errores de lectura y escritura; no reenviar el POST | `Reservar.tsx` conserva el recibo del POST aunque la relectura falle (probado en `humo.test.tsx`) |
| Validar siempre el contrato | `decodificar()` en cada método de `curarApi.ts` |
| Bloquear envíos duplicados | `mutation.isPending` + `useCandado` (`useRef`) |
| Claves coherentes entre vistas | `queries/claves.ts`; editar un médico actualiza el catálogo, el perfil y el admin |
| Cancelación | La señal de TanStack llega al `fetch`; botón *Cancelar consulta* en Supervisión (`cancelQueries`) |
| Sin secretos en el frontend | No hay tokens ni claves de API (ver limitaciones) |
| Privacidad al cerrar sesión | `queryClient.clear()` en `salir()` |

## Limitaciones conocidas (por usar json-server)

- **Autenticación simulada.** json-server no tiene backend de autenticación: el login descarga el registro del usuario y compara la contraseña en el navegador, y las contraseñas están en texto plano en `db.json`. Un backend real validaría en el servidor, guardaría las contraseñas con hash y devolvería una sesión. Nada de esto es apto para producción.
- **Código de verificación fijo** (`CODIGO_DEMO = '123456'`): es una demostración, no un segundo factor real.
- **json-server nunca responde 409.** El PDF del Lab 14 pide demostrar que un 409 (cupo agotado) no modifica el catálogo. json-server acepta cualquier POST, así que Curar evita el conflicto en el cliente: antes de reservar vuelve a leer las horas ocupadas del médico (`staleTime: 0`) y rechaza la hora si ya está tomada. Aun así, si otro usuario reserva la misma hora entre esa lectura y el POST, json-server guardaría las dos citas. Solo un servidor que valide de forma atómica, devolviendo 409, cierra esa ventana. El cliente ya está preparado: `mensajeHttp` traduce el 409 y la mutación no invalida nada si falla, así que la agenda no cambia. Lo comprueba una prueba de `humo.test.tsx` que simula el 409: aparece el mensaje, se conserva lo escrito, hay un solo POST y ningún GET de citas después.
- **Supervisión lee las ~3000 citas** de una vez (unos 776 kB). En producción se paginaría en el servidor.

## Estructura

```
src/
  services/   contract.ts (Zod + ApiError), http.ts (fetch), curarApi.ts, mensajeHttp.ts
  queries/    claves.ts, cliente.ts, catalogo.ts, citas.ts, cuentas.ts (TanStack Query)
  context/    AuthContext, FlujoContext
  hooks/      useCandado
  model/      esquemas Zod de los formularios
  components/ Layout, Campo, LimiteError, BotonFavorito, admin/, consulta/, …
  pages/      una vista por ruta
  utils/      texto (búsqueda sin tildes), filtrarCitas, formato, valoracion
  test/       vitest + Testing Library (API falsa basada en api/base.json)
api/          base.json (pruebas), seed.json (semilla), db.json (json-server)
scripts/      generar-datos.mjs
```
