# Integración de los laboratorios 11–14 en Curar

Curar es la migración del proyecto Angular a React 19 + TypeScript. Este documento contrasta cada requisito de las guías oficiales de laboratorio (semanas 11 a 14) con su implementación en el proyecto.

- **Verificación:** `npm run verify` (compilación de TypeScript + build de Vite + 118 pruebas con Vitest).
- **Leyenda:** ✅ cumple · ⚠️ cumple con un límite documentado · ➖ no aplica (justificado) · — opcional, no realizado.

## Lab 11 · Componentes, props y estado

| Requisito de la guía | Estado | Evidencia |
|---|---|---|
| Componentes en PascalCase con props `readonly` y callbacks tipados | ✅ | `src/components/*`; ningún `any` en `src` |
| Lista visible derivada con `filter` y `key` estable | ✅ | Ningún `key={index}`; las listas se calculan en el render |
| No mutar el estado; reto de ordenar sin mutar | ✅ | `utils/filtrarCitas.ts` y `utils/agenda.ts` ordenan copias; ambos tienen prueba de inmutabilidad |
| `aria-pressed`, foco visible, `prefers-reduced-motion`, Bootstrap solo como CSS | ✅ | `FiltroBotones`, `BotonFavorito`; `styles.css` |
| `StrictMode` | ✅ | `main.tsx` |
| Reto opcional: panel de detalle | — | Lo cubre `PerfilMedico` como ruta propia |

## Lab 12 · Rutas y formularios

| Requisito de la guía | Estado | Evidencia |
|---|---|---|
| Rutas de catálogo, detalle, formulario, confirmación y recurso no encontrado | ✅ | `Medicos`, `PerfilMedico`, `Reservar`, `NoEncontrada`; rutas privadas con `RutaProtegida` |
| Una sola instancia de formulario compartida con `FormProvider` y `useFormContext` | ✅ | `pages/Consulta.tsx` → `components/consulta/*Fields.tsx` |
| `useFieldArray` con `field.id` | ✅ | `components/consulta/RecetasFields.tsx` |
| `Controller` que entrega el `value` y no el objeto de opción | ✅ | `components/admin/MedicoForm.tsx` (react-select) |
| `useWatch` | ✅ | `Reservar`, `Registro`, `Reclamaciones` |
| Tipos de entrada y salida; un campo vacío no se confunde con 0 | ✅ | `z.input` / `z.output` en `src/model/*` |
| Envío pendiente bloqueado, error en `root.server`, reintento sin perder lo escrito | ✅ | `isSubmitting` en todos los formularios |
| **Reto obligatorio:** `fechaInicio` / `fechaFin`, la fecha final no puede ser anterior | ✅ | `model/rango.ts` + `components/FiltroFechas.tsx` (Historial); `test/rango.schema.test.ts` con los 4 casos (rango correcto, mismo día, rango invertido y fecha vacía) y una prueba de interfaz |
| Reto opcional: llevar el foco al quitar una fila | — | No realizado |

## Lab 13 · Hooks de React 19

| Hook | Estado | Dónde y para qué |
|---|---|---|
| `useState`, `useContext` (sintaxis `<Ctx value>`) | ✅ | `AuthContext`, `FlujoContext` |
| `useReducer` | ✅ | `components/admin/adminReducer.ts`: estado de la interfaz del administrador |
| `useEffect` + `useEffectEvent` | ✅ | Carrusel de `Home`, refresco de `PanelMedico`, carga de `Recetas` (sin suprimir advertencias de dependencias) |
| `useRef` + `useId` | ✅ | `hooks/useCandado.ts`, foco en `Layout`, `components/Campo.tsx` |
| `useMemo`, `memo`, `useCallback` | ✅ | `components/admin/SupervisionCitas.tsx` (filas memorizadas sobre 3000 citas) |
| `useTransition`, `useDeferredValue` | ✅ | Pestañas del administrador, filtros de supervisión, búsqueda del panel médico |
| `use()` + `Suspense` + límite de errores | ✅ | `pages/Recetas.tsx`, leyendo la caché con `ensureQueryData` |
| `useOptimistic` | ✅ | `components/BotonFavorito.tsx` |
| `useSyncExternalStore` + `useDebugValue` | ✅ | `hooks/useConexion.ts`: aviso "Sin conexión" en `Layout` |
| `useLayoutEffect` | ✅ | `Layout`: mide la cabecera fija para que el campo enfocado no quede tapado (WCAG 2.4.11) |
| `useImperativeHandle`, `useActionState`, `useFormStatus`, `useInsertionEffect` | ➖ | No resuelven ningún caso real de Curar; la justificación está en el README |
| Evidencia 3: qué es estado, qué es derivado y qué viene de una fuente externa | ✅ | Tabla en el README |

## Lab 14 · Servicios REST y estado remoto

| Requisito de la guía | Estado | Evidencia |
|---|---|---|
| Contrato validado con Zod; un 200 con forma inválida produce `ApiError('format')` | ✅ | `services/contract.ts`; `test/contrato.test.ts` |
| Un solo transporte HTTP (Fetch) con timeout y cancelación | ✅ | `services/http.ts` (`AbortSignal.any` + `AbortSignal.timeout`) |
| TanStack Query como única caché, con claves jerárquicas | ✅ | `src/queries/*`, `queries/claves.ts`; sin otras librerías de caché ni de HTTP |
| Proxy de desarrollo `/api` | ✅ | `vite.config.ts` |
| Conservar el recibo del POST si falla el GET y no reenviar el POST | ✅ | Prueba en `test/humo.test.tsx` |
| Bloquear envíos duplicados | ✅ | `mutation.isPending` + `useCandado` (comprobado con red 3G: un solo PATCH) |
| Cancelar una primera lectura muestra "Sin consulta activa", no un error | ✅ | Supervisión de citas (botones *Actualizar* y *Cancelar consulta*) |
| Reto semana 15: catálogo y detalle se actualizan tras una mutación, sin recargar | ✅ | Claves coherentes: editar un médico actualiza directorio, perfil y panel |
| Demostrar el 409 de cupo agotado | ⚠️ | json-server nunca devuelve 409. Una prueba lo simula: se muestra el mensaje, hay un solo POST y no se vuelve a leer ninguna lista. Límite documentado en el README |

## Fuera de las guías: revisión de diseño

No es un requisito de los laboratorios. Se revisaron todas las vistas, con las tres cuentas, a 360, 1024 y 1280 px:

- Listas por bloques: la página más larga pasó de 36 000 px a unos 2 400 px.
- Tablas convertidas en tarjetas en móvil y menú desplazable.
- Contraste AA corregido.
- Formato único de fecha y hora (`19 nov 2026 · 08:00`).
- Títulos coherentes entre páginas.
- Ningún control de formulario sin `id` ni `name`.
