# Curar (React + TypeScript + Vite)

Migración del proyecto Angular `curar` siguiendo la arquitectura de la Guía de Laboratorio 11.

## Uso

```bash
npm install          # .npmrc fija legacy-peer-deps (jsdom/vitest declaran peers opcionales que rompen npm 10)
npm run api          # json-server en http://127.0.0.1:3000 (usa api/db.json)
npm run dev          # Vite en http://localhost:5173
npm run verify       # tsc -b + vite build + vitest
```

Cuentas de `api/db.json`: paciente DNI `12345678`, médico `87654321`, admin `11112222` (ver contraseñas en el archivo).

## Equivalencias Angular → React

| Angular | React |
| --- | --- |
| `@Component` + `signal()` local | Componente funcional + `useState` |
| `computed()` | Valor calculado en el render (sin `useState`/`useEffect`) |
| `input()` / `output()` | `props` `readonly` / callbacks `onXxx` |
| `<ng-content />` | `children` |
| Servicio `Auth`, `Flujo`, `CitasStore` | `AuthContext`, `FlujoContext`, `CitasContext` + hooks `useAuth`, `useFlujo`, `useCitas` |
| `HttpClient` + RxJS | `fetch` + `async/await` (`services/http.ts`, `services/curarApi.ts`) |
| `ejecutar(obs, cargando, error, ok)` | `ejecutar(promesa, setCargando, setError)` → `Salida<T>`; hook `useCarga` |
| Reactive Forms | `useFormulario` + función pura `validar(valores)` (errores derivados) |
| `*ngFor` / `@for`, `*ngIf` / `@if` | `map` y ternarios / `&&` |
| `DatePipe`, `DecimalPipe`, `ValoracionPipe` | `utils/formato.ts`, `utils/valoracion.ts` |
| `ResaltarEstado` (directiva) | `<ArticuloEstado>` |
| `CanActivateFn` `conPermiso` | `<RutaProtegida permiso=… />` |
| `loadComponent` + `title` | `lazy` + `handle.titulo` en `router.tsx` |
| CSS encapsulado de componente | `.css` por componente con selector raíz (CSS nesting) |

## Estructura

```
src/
  types/ utils/ services/   modelos, validación/formato, API
  context/ hooks/           estado global y hooks reutilizables
  components/               Layout, RutaProtegida, TarjetaCita, TarjetaMedico, ...
  pages/                    las 24 vistas (una por ruta)
  test/                     vitest + Testing Library
```
