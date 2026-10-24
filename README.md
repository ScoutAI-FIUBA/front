# ScoutAI Frontend

Plataforma de scouting deportivo con React, TypeScript, Vite, Tailwind CSS y componentes estilo shadcn/ui. **Auth, equipos, jugadores y vinculación jugador–equipo** consumen el backend real; **partidos** también usan el backend real (`/matches`) salvo que `VITE_USE_MOCK_API=true`; los videos usan el backend real y las sesiones de análisis legacy siguen en mock.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

Levantá el backend en `tpp/back` (`docker compose up`) y abrí [http://localhost:5173](http://localhost:5173).

Registrate desde la app o usá una cuenta existente en el backend (contraseña mín. 8 caracteres).

Para volver a mocks locales: `VITE_USE_MOCK_API=true` en `.env`.

## Pantallas

- Login / Registro
- Dashboard
- Equipos (lista + vincular jugador)
- Jugadores (lista + crear)
- Partidos (lista, crear, importar planilla de estadísticas, detalle con box score)
- Videos (lista + subir)
- Análisis (lista + detalle)

## Arquitectura de servicios

```
src/services/contracts/   → interfaces
src/services/api/         → cliente HTTP (auth, teams, players)
src/services/mock/        → mocks (partidos con `VITE_USE_MOCK_API=true`, análisis legacy + fallback)
src/services/registry.ts  → punto único de cambio
```

Variables: `VITE_API_BASE_URL` (default `http://localhost:8005`), `VITE_USE_MOCK_API=true` para desactivar el backend en auth/equipos/jugadores.

## Flujo de datos demo

Usuario → Equipos → Jugadores → Partido → Roster → Video → Análisis → Eventos (`GameEvent` con `quarter` según modelo PDF).

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — build producción
- `npm run preview` — preview del build
