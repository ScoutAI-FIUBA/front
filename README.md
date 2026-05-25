# ScoutAI Frontend

Plataforma de scouting deportivo — frontend **mock-first** con React, TypeScript, Vite, Tailwind CSS y componentes estilo shadcn/ui.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173)

## Credenciales demo

| Campo | Valor |
|-------|-------|
| Email | `analista@scoutai.com` |
| Contraseña | `demo123` |

## Pantallas

- Login / Registro
- Dashboard
- Equipos (lista + vincular jugador)
- Jugadores (lista + crear)
- Partidos (crear + roster)
- Videos (lista + subir)
- Análisis (lista + detalle)

## Arquitectura mock-first

```
src/services/contracts/   → interfaces (listas para API real)
src/services/mock/        → implementaciones actuales
src/services/registry.ts  → punto único de cambio
src/mocks/store.ts        → persistencia en sessionStorage
```

Para conectar el backend real, reemplazá las exportaciones en `src/services/registry.ts` por implementaciones en `src/services/api/`.

## Flujo de datos demo

Usuario → Equipos → Jugadores → Partido → Roster → Video → Análisis → Eventos (`GameEvent` con `quarter` según modelo PDF).

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — build producción
- `npm run preview` — preview del build
