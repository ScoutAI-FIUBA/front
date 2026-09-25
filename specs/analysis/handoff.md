# Analysis Final Handoff

## Snapshot

- Fecha de cierre: 2026-09-24.
- Branch frontend: `dev`.
- HEAD: `d54057afc3055701cc40200e99f022f07bec1353` (`fix: allow opening running analysis jobs`).
- `dev` y `origin/dev`: `0` ahead / `0` behind.
- Suite frontend: 110/110 tests passing.
- Build: passing.
- Lint: 0 errores; permanecen 2 warnings preexistentes de Fast Refresh en `button.tsx` y `AuthContext.tsx`.
- Vite mantiene el warning conocido por un chunk mayor a 500 kB.
- `specs/analysis/handoff.md` es el único archivo tracked pendiente al preparar este cierre documental.
- `artifacts/` es contenido local preexistente sin trackear y debe permanecer fuera de cualquier commit.

La especificación funcional detallada vive en `specs/analysis/current.md`. Este handoff registra el cierre del bloque, su evolución verificable y los límites que deben conservarse al comenzar documentación y preparación de la demo.

## Estado general

La integración frontend job-centric de Analysis se considera cerrada para el alcance actual del TPP:

```text
Videos → Historial de análisis → ProcessingJob
       → QUEUED / RUNNING / DONE / FAILED
       → detalle por job
       → Team Side y resultados reales
```

Un fallo aislado en Team Side, Court Positions o Análisis similares se representa dentro de su propio bloque y no inutiliza el resto del detalle. No hay un motivo técnico frontend para ampliar la funcionalidad job-centric antes de comenzar la documentación del TPP y la preparación de la defensa/demo. Los hallazgos de QA manual pre-demo registrados al final requieren triage separado: pueden justificar estabilización puntual, pero no reabren por sí solos la arquitectura ni autorizan mezclar `AnalysisSession` con `ProcessingJob`.

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
- `6615631 feat: add basketball motion identity`
  - cancha SVG decorativa, responsive y local en el panel visual de Login;
  - shot arc decorativo para jobs `RUNNING`, ligado exclusivamente al `progressPercent` real;
  - movimiento sin loop autónomo y estado estático bajo `prefers-reduced-motion`.
- `d54057a fix: allow opening running analysis jobs`
  - `RUNNING` expone `Ver progreso` desde el historial del video;
  - `DONE` conserva `Ver análisis`;
  - ambas acciones reutilizan la ruta job-centric con `jobId + team_id`, mientras `QUEUED` y `FAILED` permanecen sin acción de detalle.

## Estado funcional actual

Se considera terminado:

- Videos responsive: cards en móvil y tabla en desktop.
- Carga inicial de Videos + Teams con loading, error, retry, empty real y empty por filtros.
- Actividad reciente sintética disponible sólo cuando `VITE_USE_MOCK_API=true`; en modo API real no se consulta ni se muestra.
- Filtro por `team_id` preservado en Videos y en la navegación job-centric.
- Historial real de análisis dentro de cada video.
- Creación real de ProcessingJobs.
- Polling de `QUEUED`/`RUNNING`, sin requests superpuestas, hasta un estado terminal.
- Navegación visible desde un job `RUNNING` hacia su detalle mediante `Ver progreso`; los jobs `DONE` mantienen `Ver análisis`.
- Presentación honesta de `DONE` y `FAILED`.
- Detalle real por job con recuperación de contexto de video y equipo.
- Progreso `RUNNING` con shot arc decorativo derivado del porcentaje real, sin fases inventadas y con soporte para reduced motion.
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
- Identidad deportiva sutil en Login mediante una cancha decorativa que no altera el formulario ni el flujo de autenticación.

Validación del cierre:

- 110/110 tests passing.
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

La integración job-centric de Analysis queda cerrada para desarrollo funcional dentro del alcance actual del TPP. El QA manual pre-demo puede habilitar correcciones puntuales de bajo riesgo, sin convertirlas en una migración del flujo legacy.

Próximo paso recomendado:

1. Documentar la arquitectura, decisiones, contratos y evolución del TPP.
2. Preparar el guion y recorrido de la defensa/demo.
3. Tratar cualquier ampliación futura de Analysis como un bloque nuevo, con alcance explícito y sin reabrir decisiones ya cerradas salvo que aparezca una inconsistencia concreta.

Al commitear este handoff, incluir únicamente `specs/analysis/handoff.md`. Mantener `artifacts/` fuera del índice.

## QA manual pre-demo — 24/09 noche

### Contexto y criterio de lectura

- Estos puntos provienen de QA manual y quedan registrados para reproducción, diagnóstico y priorización; no se implementó ninguna corrección al documentarlos.
- `AnalysisSession` sigue representando el flujo manual/legacy/mock y `ProcessingJob` el flujo real actual de análisis automático.
- No mezclar ambos modelos, convertir uno en adapter implícito del otro ni iniciar una migración o eliminación amplia de legacy/mocks antes de la demo.
- Un hallazgo puede ser una regresión, una limitación ya conocida, una affordance engañosa o una decisión de producto todavía pendiente. La clasificación preliminar no reemplaza el diagnóstico.

### Auth / Login

- Registro y Login no ofrecen control para mostrar u ocultar la contraseña.
- El panel visual izquierdo conserva la base rosa/borgoña histórica mientras el formulario y las acciones usan la identidad azul actual.
- Google login aparece en la interfaz, pero no está disponible.
- `¿Olvidó su contraseña?` aparece, pero no tiene comportamiento implementado.
- La sesión se percibe como corta durante el uso manual.
- Cuando la sesión vence, Videos puede terminar mostrando el error rojo genérico `No pudimos cargar los videos / Revisá la conexión...`, aunque la causa real puede ser autenticación expirada.

Notas de contexto existentes:

- La spec de Auth ya documenta un access token de 15 minutos, refresh de hasta 7 días, Google deshabilitado y recuperación de contraseña visible pero no implementada.
- El punto a diagnosticar no es sólo la duración nominal, sino por qué una expiración termina presentada como un problema genérico de conexión en Videos.

### Jugadores

- La fecha de nacimiento permite seleccionar fechas futuras.
- El área `Foto del jugador (opcional) / Arrastre o haga clic para subir imagen` no responde al click.
- La spec actual describe la foto únicamente como placeholder opcional; antes de implementar upload debe decidirse si se conecta un flujo real o se elimina la affordance de interacción.

### Videos e Inicio

- El filtro de Videos aparenta filtrar sólo los videos subidos y no se comporta de forma consistente con todos los datos mostrados en la pantalla.
- Al subir un video existe un campo `Descripción`, pero luego ese valor aparece en la columna `Rival`.
- Los videos subidos desde Videos no se pueden reproducir desde su flujo normal; la reproducción aparece actualmente al entrar al flujo de creación de colecciones.
- Inicio parece mostrar solamente videos/trabajo creados desde el flujo de Análisis y no todos los videos subidos desde Videos.

Notas de contexto existentes:

- La lista principal y la actividad reciente tienen fuentes distintas; en modo mock, la actividad es sintética y no forma parte del dataset filtrado. Debe reproducirse qué bloque concreto genera la inconsistencia percibida.
- Inicio está especificado para mostrar únicamente detalles que contienen `manualAnalysis`; por diseño actual no es un catálogo de todos los videos. El QA confirma que esa decisión resulta confusa para el usuario y la demo.
- El contrato de lista no entrega playback URL; `videoService.getById(videoId, teamId)` la resuelve para un video listo. Falta definir el punto de entrada de reproducción desde el flujo normal de Videos, no inventar una URL desde metadata de lista.

### Análisis / legacy

- `/analisis` todavía muestra entradas mock como `MAN-8599`, `SCAN-2023-9912` y otras sesiones seed.
- Nombres como `Análisis MAN-8599` no son user friendly; sería preferible un nombre dado por el usuario o contexto reconocible del video cuando exista una fuente confiable.
- Un identificador como `Análisis 77fd12a1` también resulta poco comprensible para el usuario.
- Debe mantenerse explícita la frontera entre el listado legacy basado en `AnalysisSession` y el flujo real basado en `ProcessingJob`.

Notas de contexto existentes:

- `/analisis`, `/analisis/nuevo` y `/analisis/:id` siguen usando `AnalysisSession` y `mockAnalysisService`; el detalle `/analisis/jobs/:jobId` usa `ProcessingJob` real.
- Mostrar seeds en `/analisis` es consistente con la arquitectura actual, pero constituye un riesgo de comprensión para la demo. Resolverlo no debe implicar una migración rápida entre modelos.
- Cuando no exista nombre persistido o metadata confiable, no reemplazar IDs técnicos por nombres sintéticos.

### Clips / Colecciones

- `Descargar clips` no funciona en el QA manual y requiere reproducción contra el modo y backend usados en la demo.
- Los clips numerados `1`, `2`, `3` sin nombre propio son aceptables cuando pertenecen a una misma colección; esto no debe registrarse ni corregirse como bug.
- El formulario para crear clips dentro de una colección es visualmente más rudimentario y menos intuitivo que el editor del Analysis Workspace. Se registra como mejora UX futura, sin rediseño pre-demo automático.
- En el review legacy aparece `Video no disponible para reproducción`.
- Los clips guardados visibles en ese review no son clickeables.
- Al entrar a `Ver colección`, la organización no refleja claramente categorías o colecciones creadas por el usuario, por ejemplo `Pick and Roll` y `Defensa`.

Notas de contexto existentes:

- El review legacy sólo permite seek/play cuando dispone de video reproducible y rangos confiables; el estado de video no disponible está contemplado, pero es un riesgo para el recorrido de demo.
- Los labels manuales viven en el modelo local/mock de Analysis porque el contrato backend de collection items sólo persiste rango y posición. La pérdida de categorías/nombres al entrar a la colección coincide con esa limitación y no puede corregirse honestamente sólo con presentación.
- La exportación sí figura en el contrato actual; el fallo de descarga debe diagnosticarse antes de clasificarlo como frontend, backend, URL expirada o incompatibilidad de entorno.

### Otros hallazgos de producto

- Sería útil persistir/guardar el estado del panel índice.
- Para un usuario nuevo, la diferencia conceptual entre `Partidos`, `Análisis` y `Videos` no resulta clara.
- `Partidos` y parte de `Análisis` todavía contienen datos mock, lo que aumenta esa confusión.

### Contradicciones y precisiones frente al cierre anterior

- El handoff anterior describía Analysis como cerrado. Se precisa que está cerrada la integración técnica job-centric, no todo el pulido pre-demo ni las superficies legacy.
- La afirmación de que Videos tiene filtros funcionales se mantiene para el dataset principal según implementación y tests, pero el QA reporta una inconsistencia perceptible con el conjunto total de datos mostrados. Debe reproducirse distinguiendo lista, actividad mock y otros bloques antes de corregir.
- El mensaje `Video no disponible para reproducción` y la ausencia de reproducción sin URL válida son estados contemplados; el QA no contradice esa defensa de datos, pero evidencia que el recorrido legacy puede quedar degradado durante la demo.
- Que Inicio muestre sólo `manualAnalysis` y que `/analisis` conserve seeds mock coincide con las specs actuales. La contradicción es de expectativa y comprensión de producto, no de implementación contra la spec.
- La pérdida de labels/categorías dentro de collection items coincide con una limitación contractual ya documentada. No debe solucionarse mezclando metadata mock de `AnalysisSession` con colecciones reales.

### Clasificación preliminar — sin implementación

#### 1. Quick wins seguros para antes de la demo

- Agregar mostrar/ocultar contraseña en Login y Registro como control puramente local y accesible.
- Impedir fechas de nacimiento futuras mediante límite y validación frontend coherente.
- Hacer explícito que Google y recuperación de contraseña no están disponibles —o retirar la affordance de acción para la demo— sin simular funcionalidad.
- Corregir la affordance de foto de jugador: si continúa siendo placeholder, presentarla como no interactiva; conectar un upload real queda fuera de este quick win.
- Evaluar alinear el color del panel izquierdo de Auth con los tokens actuales, manteniendo estructura, contraste y cancha decorativa.

#### 2. Requiere diagnóstico pero podría entrar

- Diferenciar sesión expirada/401 del error genérico de conexión en Videos y comprobar el flujo real de refresh.
- Reproducir el alcance del filtro de Videos separando dataset principal, actividad mock y cualquier otro bloque visible.
- Trazar por qué `Descripción` termina presentada como `Rival` y corregir el mapping sólo si se confirma sin cambiar contratos.
- Definir y validar una entrada segura de reproducción para videos listos desde Videos usando `getById` y la playback URL real.
- Confirmar por qué `Descargar clips` falla en el entorno de demo.
- Diagnosticar video no disponible y clips no interactivos en el review legacy sin acoplarlo a `ProcessingJob`.
- Verificar si un nombre real de análisis o metadata confiable de video ya está disponible para reemplazar IDs técnicos en superficies concretas.
- Precisar qué estado del panel índice debe persistirse, su alcance y almacenamiento esperado.

#### 3. Dejar después de la demo

- Migrar, unificar o eliminar `AnalysisSession`, seeds, mocks y `ProcessingJob`.
- Rediseñar el formulario de clips de Colecciones para equipararlo al Analysis Workspace.
- Persistir labels/categorías de clips en colecciones sin un contrato backend que los represente.
- Replantear en profundidad la arquitectura de información entre `Partidos`, `Análisis`, `Videos` e Inicio.
- Convertir Inicio en un catálogo completo de videos o mezclar allí datasets legacy y reales sin una definición de producto.
- Implementar upload real de fotos de jugadores si requiere almacenamiento, endpoints o cambios contractuales.
