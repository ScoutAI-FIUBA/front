# Analysis Integration Handoff

## Snapshot

- Fecha de cierre: 2026-09-17.
- Branch frontend: `dev`.
- El bloque de Shooting Stats + Shot Chart queda cerrado en `dev` con commit y push.
- Baseline backend verificado: `origin/main` en `c1a78ded97565080ada7fa435aa50744d469473f`.
- Shooting Stats, Shot Chart y Court Positions están implementados y verificados localmente: 63/63 tests, build passing y lint sin errores.
- El smoke test real posterior a `DONE` quedó bloqueado exclusivamente por un deploy backend desactualizado: el frontend llama correctamente a `GET /jobs/{job_id}/team-sides?team_id=...`, la ruta existe en `origin/main`, pero el backend desplegado responde `404 {"detail":"Not Found"}`.
- `artifacts/` es contenido local preexistente sin trackear y no forma parte de estos bloques.

La descripción detallada del comportamiento vigente permanece en `specs/analysis/current.md`. Este documento registra solamente el punto de continuación y el estado operativo del working tree.

## Estado alcanzado

El frontend ya implementa el flujo real basado en `ProcessingJob`:

1. Contrato y types de `ProcessingJob` con estados `QUEUED`, `RUNNING`, `DONE` y `FAILED`.
2. Lectura de jobs por video mediante `GET /videos/{video_id}/jobs?team_id=...`.
3. Historial real dentro del contexto de cada video.
4. Polling no superpuesto mientras existan jobs `QUEUED` o `RUNNING`.
5. Creación real mediante `POST /videos/{video_id}/jobs` con `team_id` en el body.
6. Detalle job-centric en `/analisis/jobs/:jobId?team_id=...`.
7. Lectura y persistencia de `our_team_side`.
8. Shooting Stats reales mediante `/jobs/{jobId}/stats`.
9. Shot Chart real mediante `/jobs/{jobId}/shot-chart`, con filtro local por jugador.
10. Court Positions reales mediante `/jobs/{jobId}/court-positions`, con trayectorias y filtros locales.

Flujo validado hasta este punto:

```text
Team → Video → iniciar análisis → QUEUED → RUNNING → DONE
     → Ver análisis → court positions
                    → confirmar team-side → shooting stats → shot chart
```

La creación, el polling y la transición hasta `DONE` fueron validados manualmente contra el backend real con el job `f504888a-978a-4f43-a130-280e730c5a04`. La validación automatizada cubre team-side `0`, team-side `1`, cambio de lado, Shooting Stats, Shot Chart, Court Positions y recarga sin datos stale. El smoke de los bloques posteriores a `DONE` sigue pendiente únicamente hasta que el backend desplegado publique el contrato ya presente en `origin/main`; esto no bloquea continuar la implementación frontend.

## Arquitectura que debe conservarse

- `ProcessingJob` y `AnalysisSession` son modelos independientes.
- El review mock de 6E en `/analisis/:id` permanece intacto.
- No inventar `matchId` ni relaciones Job ↔ Match.
- No convertir `ProcessingJob` a `AnalysisSession`.
- Los contratos reales usan services/adapters específicos:
  - `analysisJobService`;
  - `analysisJobTeamSideService`;
  - `analysisJobStatsService`;
  - `analysisJobShotChartService`;
  - `analysisJobCourtPositionsService`.
- `AnalysisJobDetailPage` coordina los bloques mediante el `ProcessingJob`; TeamSide, Stats, ShotChart y Court Positions no deben depender internamente unos de otros.
- Stats y ShotChart sólo consultan un job `DONE` con `ourTeamSide` confirmado.
- Cambiar `ourTeamSide` invalida y remonta Stats y ShotChart para evitar identidades del mapping anterior.
- Court Positions consulta cualquier job `DONE`, no depende de `ourTeamSide` y no refetch al cambiar el lado confirmado.
- Stats y Shot Chart muestran identidades únicamente desde `roster_name` / `display_name` del backend. Court Positions usa sólo dorsal backend o el identificador técnico `Track {track_id}`. No fabricar jugadores.

## Backend y decisiones vigentes

- Usar `origin/main` como fuente de verdad y volver a actualizar esa referencia antes de iniciar el próximo contrato.
- La navegación esperada es `Equipo → Videos → análisis del video`.
- El historial real necesario es por video; actualmente no se necesita un historial global de jobs.
- Clip Collections es el contrato vigente para clips y no debe mezclarse con el flujo job-centric.
- Shooting, zonas y Shot Chart son datos reales del backend.
- Court Positions usa `sample_every=5` encapsulado en el adapter; las métricas de movimiento permanecen exactamente como las calcula el backend sobre la trayectoria completa.
- `coverage.not_measured` debe seguir representándose honestamente.
- Pases, pérdidas, asistencias, robos, rebotes y otras métricas no medidas no deben mostrarse con valores inventados.
- No agregar fallbacks, mocks de producción ni datos sintéticos para ocultar el `404` del deploy atrasado.

## Archivos del bloque cerrado

Archivos modificados incluidos en el cierre:

- `PROJECT_MAP.md`
- `specs/analysis/current.md`
- `src/pages/analysis/AnalysisJobDetailPage.tsx`
- `src/services/registry.ts`
- `src/types/index.ts`

Archivos nuevos de Shooting Stats:

- `src/pages/analysis/AnalysisJobShootingStats.tsx`
- `src/pages/analysis/analysis-job-stats.ts`
- `src/services/contracts/analysis-job-stats.service.ts`
- `src/services/api/analysis-job-stats.client.ts`
- `src/services/api/analysis-job-stats.api.ts`
- `tests/analysis-job-stats.test.ts`

Archivos nuevos de Shot Chart:

- `src/components/analysis/ShotChartCourt.tsx`
- `src/components/analysis/shot-chart-court.ts`
- `src/pages/analysis/AnalysisJobShotChart.tsx`
- `src/pages/analysis/analysis-job-shot-chart.ts`
- `src/services/contracts/analysis-job-shot-chart.service.ts`
- `src/services/api/analysis-job-shot-chart.client.ts`
- `src/services/api/analysis-job-shot-chart.api.ts`
- `tests/analysis-job-shot-chart.test.ts`

Archivos nuevos de Court Positions:

- `src/components/analysis/CourtPositionsCourt.tsx`
- `src/components/analysis/court-positions-court.ts`
- `src/pages/analysis/AnalysisJobCourtPositions.tsx`
- `src/pages/analysis/analysis-job-court-positions.ts`
- `src/services/contracts/analysis-job-court-positions.service.ts`
- `src/services/api/analysis-job-court-positions.client.ts`
- `src/services/api/analysis-job-court-positions.api.ts`
- `tests/analysis-job-court-positions.test.ts`

`specs/analysis/handoff.md` también forma parte del cierre documental. `artifacts/` permanece local, sin trackear y excluido del commit.

## Estado específico del Shot Chart

Contrato:

```http
GET /jobs/{jobId}/shot-chart?team_id={teamId}
```

El response real contiene:

- `court`: `length_m`, `width_m`, `hoop_inset_m`, ambos `hoops`, `three_point_radius_m` y `corner_three_lateral_m`;
- `shots`: identidad nullable, `x_m`, `y_m`, `made`, `result`, `points`, `zone`, `distance_m`, `shot_type`, timestamp y attribution;
- `players`: `track_id`, lado, camiseta, `display_name` y sus tiros;
- `coverage`: cobertura de shooting, `shots_charted` y `filtered_to_track_id`.

Decisiones de UI:

- La cancha usa `court.length_m × court.width_m` como sistema de coordenadas.
- Cada marker se transforma con `left = x_m / length_m` y `top = y_m / width_m`.
- Coordenadas no finitas o fuera de esas dimensiones no se dibujan.
- `made`, `missed` y `unknown` tienen tratamientos separados; `unknown` nunca se muestra como fallo.
- El valor 2P/3P se muestra dentro del marker.
- El filtro por jugador es local; no se envía `track_id` ni se generan requests adicionales.
- Tiros sin posición y sin shooter se reflejan mediante coverage.

Verificación del bloque:

- 12 tests específicos de Shot Chart agregados.
- Suite relevante completa: 52/52 tests passing.
- `npm run build`: passing.
- `npm run lint`: 0 errores; permanecen 2 warnings preexistentes de Fast Refresh en `button.tsx` y `AuthContext.tsx`.
- Vite mantiene el warning conocido por un chunk mayor a 500 kB.
- Commit y push del bloque: completados en `dev`.
- Smoke test manual desktop/mobile contra backend real: pendiente sólo por el deploy backend desactualizado que no registra todavía `/jobs/{job_id}/team-sides`.

## No implementado

- Heatmap.
- Similares.
- `/jobs/{id}/results`.
- Comparaciones entre jugadores o equipos.
- Integración Match ↔ Job.
- Migración o eliminación del review mock 6E.

## Próximo bloque recomendado

Court Positions queda implementado. Antes de iniciar otro bloque:

1. Mantener registrado el smoke pendiente como bloqueo de entorno; no reabrir los bloques cerrados ni inventar fallbacks frontend.
2. Ejecutar smoke desktop/mobile cuando el deploy backend publique los endpoints presentes en `origin/main`.
3. No iniciar Heatmap sin una instrucción separada y sin definir primero si será una derivación local de Court Positions o un contrato backend propio.

Secuencia posterior recomendada:

```text
heatmap → similares/comparaciones → pulido UI
```

No iniciar esas implementaciones desde este handoff.
