import type { RefObject } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Film,
  LoaderCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Save,
  Scissors,
  Trash2,
  UserRound,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ManualAnalysisClip, Player } from '@/types'
import { ClipTimeline } from './ClipTimeline'
import type { PreparedAnalysisSetup } from './AnalysisSetup'

export interface WorkspaceClip extends ManualAnalysisClip {
  note?: string
  playerIds?: string[]
}

export type WorkspaceSaveState = 'unsaved' | 'saving' | 'saved' | 'partial-failure'

interface AnalysisWorkspaceProps {
  preparedSetup: PreparedAnalysisSetup
  videoRef: RefObject<HTMLVideoElement>
  videoUrl: string
  duration: number
  currentTime: number
  rangeStart: number | null
  rangeEnd: number | null
  clipLabel: string
  clipNote: string
  selectedPlayerIds: string[]
  players: Player[]
  playersUnavailable: boolean
  clips: WorkspaceClip[]
  editingClipId: string | null
  saveState: WorkspaceSaveState
  saveError: string
  onEditSetup: () => void
  onSaveAnalysis: () => void
  onLoadedMetadata: (duration: number) => void
  onTimeUpdate: () => void
  onSeek: (time: number) => void
  onRangeChange: (start: number, end: number) => void
  onMarkStart: () => void
  onMarkEnd: () => void
  onClearRange: () => void
  onClipLabelChange: (label: string) => void
  onClipNoteChange: (note: string) => void
  onTogglePlayer: (playerId: string) => void
  onSaveClip: () => void
  onPlayClip: (clip: WorkspaceClip) => void
  onEditClip: (clip: WorkspaceClip) => void
  onRemoveClip: (clip: WorkspaceClip) => void
  onApplyCurrentTime: (edge: 'start' | 'end') => void
}

function formatSeconds(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function SaveState({ state }: { state: WorkspaceSaveState }) {
  const content = {
    unsaved: { label: 'Sin guardar', icon: Clock3, className: 'text-warning' },
    saving: { label: 'Guardando…', icon: LoaderCircle, className: 'text-information' },
    saved: { label: 'Guardado', icon: CircleCheck, className: 'text-success' },
    'partial-failure': { label: 'Guardado parcial', icon: CircleAlert, className: 'text-warning' },
  }[state]
  const Icon = content.icon

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${content.className}`} aria-live="polite">
      <Icon className={`h-4 w-4 ${state === 'saving' ? 'animate-spin' : ''}`} aria-hidden="true" />
      {content.label}
    </span>
  )
}

export function AnalysisWorkspace({
  preparedSetup,
  videoRef,
  videoUrl,
  duration,
  currentTime,
  rangeStart,
  rangeEnd,
  clipLabel,
  clipNote,
  selectedPlayerIds,
  players,
  playersUnavailable,
  clips,
  editingClipId,
  saveState,
  saveError,
  onEditSetup,
  onSaveAnalysis,
  onLoadedMetadata,
  onTimeUpdate,
  onSeek,
  onRangeChange,
  onMarkStart,
  onMarkEnd,
  onClearRange,
  onClipLabelChange,
  onClipNoteChange,
  onTogglePlayer,
  onSaveClip,
  onPlayClip,
  onEditClip,
  onRemoveClip,
  onApplyCurrentTime,
}: AnalysisWorkspaceProps) {
  const hasStart = rangeStart != null
  const hasRange = rangeStart != null && rangeEnd != null && rangeEnd > rangeStart
  const canMarkEnd = rangeStart != null && currentTime > rangeStart

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-4">
      <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Espacio de análisis</p>
          <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">{preparedSetup.analysisName}</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {preparedSetup.team.name}
            {preparedSetup.rivalTeam ? ` vs ${preparedSetup.rivalTeam.name}` : ''}
          </p>
          {preparedSetup.uploadedDuringSetup && (
            <p className="mt-1 text-xs text-information">El video está subido; el análisis todavía no.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SaveState state={saveState} />
          <Button variant="ghost" size="sm" onClick={onEditSetup} disabled={saveState === 'saving'}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Editar preparación
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveAnalysis}
            disabled={clips.length === 0 || saveState === 'saving' || saveState === 'saved'}
          >
            {saveState === 'saving' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            Guardar análisis
          </Button>
        </div>
      </header>

      {saveState === 'saved' && (
        <div className="flex items-center gap-3 rounded-lg border border-success/35 bg-success/10 px-4 py-3 text-sm text-success" role="status">
          <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          Análisis guardado. Abriendo el detalle…
        </div>
      )}

      {saveState === 'partial-failure' && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm" role="alert">
          <p className="font-semibold text-warning">El guardado quedó incompleto</p>
          <p className="mt-1 text-muted-foreground">{saveError || 'Conservamos el video y todos los clips en este espacio.'}</p>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 overflow-hidden rounded-lg border bg-surface" aria-label="Video y línea de tiempo">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Video</p>
              <p className="truncate text-xs text-muted-foreground">
                {preparedSetup.sourceFile?.name ?? preparedSetup.video.title}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {formatSeconds(currentTime)} / {formatSeconds(duration)}
            </span>
          </div>

          <div className="bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                className="aspect-video w-full bg-black object-contain"
                onLoadedMetadata={(event) => onLoadedMetadata(event.currentTarget.duration)}
                onTimeUpdate={onTimeUpdate}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center text-white">
                <div className="text-center">
                  <Video className="mx-auto mb-3 h-12 w-12 opacity-70" aria-hidden="true" />
                  <p className="text-sm">El video no está disponible.</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4">
            <ClipTimeline
              videoUrl={videoUrl}
              duration={duration}
              currentTime={currentTime}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              maxRangeSeconds={30}
              onSeek={onSeek}
              onRangeChange={onRangeChange}
            />
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-20" aria-label="Herramientas del análisis">
          <section className="rounded-lg border bg-surface-elevated p-4" aria-labelledby="current-action-title">
            {!hasStart && (
              <div className="py-2 text-center sm:text-left">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-subtle text-primary sm:mx-0">
                  <Play className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 id="current-action-title" className="mt-4 text-base font-semibold">Reproducí el video y marcá una jugada.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cuando veas el inicio, pausá o dejá el video en ese momento.
                </p>
                <Button className="mt-5 w-full" onClick={onMarkStart} disabled={duration <= 0}>
                  <Scissors className="h-4 w-4" aria-hidden="true" /> Marcar inicio en {formatSeconds(currentTime)}
                </Button>
              </div>
            )}

            {hasStart && !hasRange && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Inicio marcado</p>
                <h2 id="current-action-title" className="mt-2 text-lg font-semibold">{formatSeconds(rangeStart ?? 0)}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Reproducí hasta el final de la jugada y marcá el cierre.
                </p>
                <Button className="mt-5 w-full" onClick={onMarkEnd} disabled={!canMarkEnd}>
                  <Pause className="h-4 w-4" aria-hidden="true" /> Marcar fin en {formatSeconds(currentTime)}
                </Button>
                <Button variant="ghost" className="mt-2 w-full" onClick={onClearRange}>Cancelar selección</Button>
              </div>
            )}

            {hasRange && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {editingClipId ? 'Editando borrador' : 'Rango seleccionado'}
                    </p>
                    <h2 id="current-action-title" className="mt-1 font-mono text-lg font-semibold">
                      {formatSeconds(rangeStart ?? 0)}–{formatSeconds(rangeEnd ?? 0)}
                    </h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClearRange}>Cancelar</Button>
                </div>

                <div>
                  <Label htmlFor="workspace-clip-label">Etiqueta</Label>
                  <Input
                    id="workspace-clip-label"
                    list="analysis-labels"
                    value={clipLabel}
                    onChange={(event) => onClipLabelChange(event.target.value)}
                    className="mt-2"
                  />
                  <datalist id="analysis-labels">
                    {['Pick and Roll', 'Transición', 'Defensa', 'Tiro exterior'].map((label) => <option key={label} value={label} />)}
                  </datalist>
                </div>

                <details className="group rounded-md border bg-surface-subtle/50 px-3 py-2.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                    Jugadores y nota <span className="text-xs font-normal text-muted-foreground">Opcional</span>
                    <ChevronDown className="ml-2 h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="mt-3 space-y-4 border-t pt-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Jugadores relacionados</p>
                      {playersUnavailable ? (
                        <p className="mt-2 text-xs text-muted-foreground">No pudimos cargar jugadores. Podés guardar el clip igualmente.</p>
                      ) : players.length > 0 ? (
                        <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                          {players.map((player) => {
                            const selected = selectedPlayerIds.includes(player.id)
                            return (
                              <button
                                key={player.id}
                                type="button"
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${selected ? 'border-primary bg-primary-subtle text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                aria-pressed={selected}
                                onClick={() => onTogglePlayer(player.id)}
                              >
                                {selected ? <Check className="h-3 w-3" aria-hidden="true" /> : <UserRound className="h-3 w-3" aria-hidden="true" />}
                                {player.firstName} {player.lastName}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No hay jugadores asociados al equipo.</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="workspace-clip-note">Nota</Label>
                      <textarea
                        id="workspace-clip-note"
                        value={clipNote}
                        onChange={(event) => onClipNoteChange(event.target.value)}
                        rows={3}
                        placeholder="Observación breve sobre la jugada"
                        className="mt-2 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </details>

                <details className="group rounded-md border px-3 py-2.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-muted-foreground">
                    Ajuste preciso
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
                    <div>
                      <Label htmlFor="workspace-range-start">Inicio</Label>
                      <div className="mt-1.5 flex gap-1.5">
                        <Input
                          id="workspace-range-start"
                          type="number"
                          min="0"
                          step="0.1"
                          value={rangeStart ?? ''}
                          onChange={(event) => onRangeChange(Number(event.target.value), rangeEnd ?? 0)}
                        />
                        <Button variant="outline" size="sm" onClick={() => onApplyCurrentTime('start')}>Actual</Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="workspace-range-end">Fin</Label>
                      <div className="mt-1.5 flex gap-1.5">
                        <Input
                          id="workspace-range-end"
                          type="number"
                          min="0"
                          step="0.1"
                          value={rangeEnd ?? ''}
                          onChange={(event) => onRangeChange(rangeStart ?? 0, Number(event.target.value))}
                        />
                        <Button variant="outline" size="sm" onClick={() => onApplyCurrentTime('end')}>Actual</Button>
                      </div>
                    </div>
                  </div>
                </details>

                <Button className="w-full" onClick={onSaveClip}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {editingClipId ? 'Guardar cambios' : 'Guardar clip'}
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-surface p-3" aria-labelledby="clip-library-title">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <div>
                <h2 id="clip-library-title" className="text-sm font-semibold">Clips</h2>
                <p className="text-xs text-muted-foreground">{clips.length} en este análisis</p>
              </div>
              <Film className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>

            {clips.length === 0 ? (
              <div className="rounded-md bg-surface-subtle/65 px-3 py-5 text-center">
                <p className="text-sm text-muted-foreground">Los clips que guardes aparecerán acá.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {clips.map((clip, index) => (
                  <div key={clip.id} className="group flex items-center gap-2 rounded-md border border-transparent bg-surface-subtle/45 p-1.5 hover:border-border-strong">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded px-1.5 py-1.5 text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onPlayClip(clip)}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{clip.label}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {formatSeconds(clip.startSecond)}–{formatSeconds(clip.endSecond)} · Clip {index + 1}
                        </span>
                      </span>
                    </button>

                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Más acciones para ${clip.label}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          align="end"
                          sideOffset={6}
                          className="z-50 min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
                        >
                          <DropdownMenu.Item
                            className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-sm outline-none hover:bg-surface-subtle focus:bg-surface-subtle"
                            onSelect={() => onEditClip(clip)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" /> Editar borrador
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-sm text-destructive outline-none hover:bg-destructive/10 focus:bg-destructive/10"
                            onSelect={() => onRemoveClip(clip)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar borrador
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                ))}
              </div>
            )}
          </section>

          <details className="group rounded-lg border bg-surface px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              Contexto del análisis
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <dl className="mt-3 space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Equipo</dt><dd className="text-right">{preparedSetup.team.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Rival</dt><dd className="text-right">{preparedSetup.rivalTeam?.name ?? 'Sin definir'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Fecha</dt><dd className="text-right">{preparedSetup.matchDate || 'Sin definir'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Contexto</dt><dd className="max-w-52 text-right">{preparedSetup.matchContext || 'Sin definir'}</dd></div>
            </dl>
          </details>
        </aside>
      </div>
    </div>
  )
}
