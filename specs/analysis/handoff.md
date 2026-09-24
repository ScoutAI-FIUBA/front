# Analysis Final Handoff

## Snapshot

- Fecha de cierre: 2026-09-23.
- Branch frontend: `dev`.
- HEAD: `acf061cc959b0d564f7511e6a28885847c34ebce` (`fix: finalize videos analysis flow`).
- `dev` y `origin/dev`: `0` ahead / `0` behind.
- Suite frontend: 106/106 tests passing.
- Build: passing.
- Lint: 0 errores; permanecen 2 warnings preexistentes de Fast Refresh en `button.tsx` y `AuthContext.tsx`.
- Vite mantiene el warning conocido por un chunk mayor a 500 kB.
- `specs/analysis/handoff.md` es el único archivo tracked pendiente al preparar este cierre documental.
- `artifacts/` es contenido local preexistente sin trackear y debe permanecer fuera de cualquier commit.

La especificación funcional detallada vive en `specs/analysis/current.md`. Este handoff registra el cierre del bloque, su evolución verificable y los límites que deben conservarse al comenzar documentación y preparación de la demo.

## Estado general

El flujo frontend real de Analysis se considera cerrado para el alcance actual del TPP:

```text
Videos → Historial de análisis → ProcessingJob
       → QUEUED / RUNNING / DONE / FAILED
       → detalle por job
       → Team Side y resultados reales
```

Un fallo aislado en Team Side, Court Positions o Análisis similares se representa dentro de su propio bloque y no inutiliza el resto del detalle. No hay un motivo técnico frontend para continuar agregando funcionalidad de Analysis antes de comenzar la documentación del TPP y la preparación de la defensa/demo.

## Evolución UX/UI previa a ProcessingJob

Estas fases fueron iteraciones de experiencia y presentación del frontend. No deben confundirse con la integración posterior de ProcessingJobs reales.

### Phase 6C — Setup y base UX

- Commit: `cf57982 feat(frontend): redesign core UX foundation and analysis setup`.
- Reorganizó el inicio del análisis como preparación progresiva: selección de material, video existente o nuevo, validaciones, creación inline de equipo y upload antes del workspace.
- Estableció la base visual, los componentes de estado y la separación entre preparación y edición.
- El flujo de análisis subyacente seguía siendo manual/mock.

### Phase 6D — Analysis Workspace

- Commit: `b1417c0 feat(frontend): redesign analysis workspace experience`.
- Merge: `d0b80ff`.
- Reordenó el workspace alrededor del video y la timeline, con navegación compacta y panel secundario contextual.
- Eliminó rangos iniciales fabricados e incorporó estados honestos para inicio sin fin, rango válido, edición de etiqueta y guardado.
- Hizo explícito que los drafts eran locales; no introdujo ProcessingJobs reales.

### Phase 6E — Analysis List and Review

- Commit: `99d043d feat(frontend): redesign analysis list and review`.
- Merge: `a0db442`.
- Convirtió la lista en una superficie de trabajo escaneable y agregó estados loading, error, empty y populated.
- Reorganizó el review con video o momentos como contenido principal, metadata secundaria y navegación basada sólo en IDs persistidos.
- Evitó porcentajes y acciones no respaldadas por datos confiables.
- La fuente seguía siendo `AnalysisSession` y los servicios legacy/manual/mock.

### Phase 6F

No existió una Phase 6F formal en el historial Git, las specs ni los handoffs versionados. Después de 6E comenzó la integración técnica de ProcessingJobs reales. No debe asignarse retrospectivamente el nombre 6F a ese trabajo.

## Integración de ProcessingJob real

La integración job-centric ocurrió después de las fases UX/UI anteriores:

- `3820b36 feat: add analysis job history and polling`
  - historial real por video;
  - polling no superpuesto para jobs `QUEUED` y `RUNNING`;
  - estados terminales `DONE` y `FAILED`.
- `0128fe3 feat: create analysis jobs from videos`
  - creación real desde Videos;
  - preservación del historial y comienzo de polling después de crear un job.
- `8e220c5 feat: add job-centric analysis detail and team side`
  - detalle refresh-safe por `jobId + teamId`;
  - lectura y persistencia de `our_team_side`.
- `c72eff1 feat: add shooting stats and shot chart`
  - estadísticas de tiro detectadas;
  - mapa de tiros con posiciones y estados honestos de cobertura.
- `62d2f81 feat: add court position trajectories`
  - Court Positions reales;
  - trayectorias, filtros locales, cobertura `truncated` y registros fuera de cancha.
- `0431420 feat: add court position heatmap`
  - Heatmap derivado localmente de las posiciones reales de Court Positions;
  - concentración relativa de muestras, sin endpoint ni refetch adicional.
- `420c38b feat: add similar analysis results`
  - Análisis similares para jobs `DONE` del mismo Team;
  - navegación al job relacionado conservando `team_id`.
- `d452682 fix: polish analysis demo experience`
  - terminología, jerarquía, errores locales, responsive y presentación para demo.
- `acf061c fix: finalize videos analysis flow`
  - carga principal Videos + Teams con loading, error, retry y empty explícitos;
  - actividad reciente mock aislada del modo API real;
  - cierre funcional del acceso Videos → Analysis.

## Estado funcional actual

Se considera terminado:

- Videos responsive: cards en móvil y tabla en desktop.
- Carga inicial de Videos + Teams con loading, error, retry, empty real y empty por filtros.
- Actividad reciente sintética disponible sólo cuando `VITE_USE_MOCK_API=true`; en modo API real no se consulta ni se muestra.
- Filtro por `team_id` preservado en Videos y en la navegación job-centric.
- Historial real de análisis dentro de cada video.
- Creación real de ProcessingJobs.
- Polling de `QUEUED`/`RUNNING`, sin requests superpuestas, hasta un estado terminal.
- Presentación honesta de `DONE` y `FAILED`.
- Detalle real por job con recuperación de contexto de video y equipo.
- Identificación y persistencia de Team Side.
- Estadísticas de tiro detectadas, sin presentarlas como box score oficial.
- Mapa de tiros con estados `made`, `missed` y `unknown` diferenciados.
- Court Positions con posiciones, trayectorias, filtros locales y métricas de movimiento backend sin reinterpretación.
- Heatmap como concentración relativa de muestras espaciales válidas del filtro activo.
- Análisis similares con scores general, de tiros y de movimiento, sin convertirlos en precisión, confianza o recomendación.
- Loading, error, retry y empty states locales en los bloques del detalle.
- Fallos aislados que no derriban el resto de la página.
- Responsive móvil/desktop para Videos y el detalle de Analysis.
- Terminología y jerarquía visual ajustadas para demo.

Validación del cierre:

- 106/106 tests passing.
- Build passing.
- Lint con 0 errores y 2 warnings preexistentes.
- Revisión visual razonable de los flujos responsive y del demo polish.

## Arquitectura que debe conservarse

- `AnalysisSession` representa el flujo legacy/manual/mock.
- `ProcessingJob` representa el flujo real actual de análisis automático.
- No convertir `ProcessingJob` en `AnalysisSession` ni usar uno como adapter implícito del otro.
- No eliminar todavía el flujo legacy: su migración o retiro requiere una decisión separada.
- No usar mocks ni datos sintéticos como fallback del flujo real.
- `ProcessingJob` y sus resultados usan services/adapters específicos y contratos backend reales.
- Team Side, Shooting Stats, Shot Chart, Court Positions y Análisis similares mantienen loading/error/retry locales.
- Shooting Stats y Shot Chart dependen de un Team Side confirmado.
- Court Positions y Heatmap no dependen de `our_team_side` y reutilizan el mismo dataset cargado.
- Análisis similares es un bloque independiente y no depende de Team Side, Stats, Shot Chart, Court Positions ni Heatmap.
- No fabricar jugadores, nombres, rivales, fechas, thumbnails, métricas ni relaciones con partidos cuando el contrato no los entrega.

## Dependencias externas y limitaciones conocidas

Estos puntos no son bugs frontend:

- El deploy backend puede estar desactualizado y responder `404` para `/jobs/{jobId}/team-sides` aunque el contrato exista en la rama backend de referencia.
- `/jobs/{jobId}/similar` también depende de que el backend desplegado incluya ese endpoint.
- El frontend maneja esos fallos como errores locales y recuperables; no modifica contratos ni usa mocks para ocultarlos.
- La cantidad, calidad, identidad y cobertura de tiros, posiciones, trayectorias, scores similares y demás detecciones dependen del backend y del modelo de visión.
- El muestreo y las métricas backend pueden limitar la precisión interpretativa; la UI mantiene semántica defensiva y no reconstruye tiempo, posesión o eventos no medidos.

## Fuera del alcance actual / futuro

No son pendientes para cerrar Analysis en el alcance actual:

- comparación de jugadores;
- comparación de equipos;
- jugadores similares;
- equipos similares;
- scouting automático, recomendaciones o ranking de candidatos;
- relación `ProcessingJob ↔ Match`;
- historial global de ProcessingJobs fuera del contexto de cada video;
- metadata avanzada para Análisis similares, como nombres, rivales, fechas o thumbnails;
- posesión, segundos o porcentaje de tiempo en una zona;
- métricas temporales reconstruidas desde las muestras espaciales;
- migración o eliminación completa de `AnalysisSession` y del review legacy 6E.

Estas ideas requieren definición de producto y, en varios casos, contratos o modelos backend nuevos. No deben inferirse a partir de mocks históricos ni presentarse como trabajo faltante del flujo actual.

## Punto de continuación

Analysis queda cerrado para desarrollo funcional dentro del alcance actual del TPP.

Próximo paso recomendado:

1. Documentar la arquitectura, decisiones, contratos y evolución del TPP.
2. Preparar el guion y recorrido de la defensa/demo.
3. Tratar cualquier ampliación futura de Analysis como un bloque nuevo, con alcance explícito y sin reabrir decisiones ya cerradas salvo que aparezca una inconsistencia concreta.

Al commitear este handoff, incluir únicamente `specs/analysis/handoff.md`. Mantener `artifacts/` fuera del índice.
