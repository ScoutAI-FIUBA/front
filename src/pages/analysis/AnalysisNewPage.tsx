import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import type { AppShellOutletContext } from '@/components/layout/AppShell'
import { analysisService, clipCollectionService, isMockApiEnabled, playerService } from '@/services/registry'
import type { Player } from '@/types'
import { AnalysisSetup, type PreparedAnalysisSetup } from './AnalysisSetup'
import {
  AnalysisWorkspace,
  type WorkspaceClip,
  type WorkspaceSaveState,
} from './AnalysisWorkspace'
import { normalizeClipRangeUpdate } from './clip-range'

const DEFAULT_CLIP_LABEL = 'Pick and Roll'
const MAX_CLIP_DURATION_SECONDS = 30
const SAVED_ACKNOWLEDGEMENT_MS = 1_800

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function AnalysisNewPage() {
  const navigate = useNavigate()
  const { setWorkspaceMode } = useOutletContext<AppShellOutletContext>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const ownedVideoUrlRef = useRef('')
  const navigationTimerRef = useRef<number | null>(null)
  const [preparedSetup, setPreparedSetup] = useState<PreparedAnalysisSetup | null>(null)
  const [editingSetup, setEditingSetup] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [rangeStart, setRangeStart] = useState<number | null>(null)
  const [rangeEnd, setRangeEnd] = useState<number | null>(null)
  const [clipLabel, setClipLabel] = useState(DEFAULT_CLIP_LABEL)
  const [clipNote, setClipNote] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [playersUnavailable, setPlayersUnavailable] = useState(false)
  const [clips, setClips] = useState<WorkspaceClip[]>([])
  const [editingClipId, setEditingClipId] = useState<string | null>(null)
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<WorkspaceSaveState>('unsaved')
  const [saveError, setSaveError] = useState('')

  const workspaceActive = Boolean(preparedSetup && !editingSetup)

  useEffect(() => {
    setWorkspaceMode(workspaceActive)
    return () => setWorkspaceMode(false)
  }, [setWorkspaceMode, workspaceActive])

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current != null) window.clearTimeout(navigationTimerRef.current)
      if (ownedVideoUrlRef.current) URL.revokeObjectURL(ownedVideoUrlRef.current)
    }
  }, [])

  useEffect(() => {
    setActiveClipEnd(null)
  }, [videoUrl])

  useEffect(() => {
    if (!preparedSetup?.uploadedDuringSetup || saveState === 'saved') return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [preparedSetup?.uploadedDuringSetup, saveState])

  useEffect(() => {
    if (!workspaceActive || !preparedSetup) return
    let cancelled = false
    setPlayersUnavailable(false)
    void playerService.filterByTeam(preparedSetup.team.id)
      .then((teamPlayers) => {
        if (!cancelled) setPlayers(teamPlayers)
      })
      .catch(() => {
        if (!cancelled) {
          setPlayers([])
          setPlayersUnavailable(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [preparedSetup, workspaceActive])

  const markUnsaved = () => {
    setSaveState((current) => current === 'partial-failure' ? current : 'unsaved')
    if (saveState !== 'partial-failure') setSaveError('')
  }

  const clearRangeDraft = () => {
    setRangeStart(null)
    setRangeEnd(null)
    setClipLabel(DEFAULT_CLIP_LABEL)
    setClipNote('')
    setSelectedPlayerIds([])
    setEditingClipId(null)
    setActiveClipEnd(null)
  }

  const handlePreparedSetup = (nextSetup: PreparedAnalysisSetup) => {
    const materialChanged = preparedSetup?.video.id !== nextSetup.video.id
    if (materialChanged && clips.length > 0) {
      toast.error('El video no puede cambiarse porque ya hay clips marcados')
      return
    }

    if (materialChanged) {
      if (ownedVideoUrlRef.current) URL.revokeObjectURL(ownedVideoUrlRef.current)
      ownedVideoUrlRef.current = nextSetup.playbackUrl.startsWith('blob:')
        ? nextSetup.playbackUrl
        : ''
      setVideoUrl(nextSetup.playbackUrl)
      setDuration(nextSetup.durationSeconds)
      setCurrentTime(0)
      setClips([])
      clearRangeDraft()
    }

    setPreparedSetup(nextSetup)
    setEditingSetup(false)
    markUnsaved()
  }

  const seekVideo = (time: number) => {
    const nextTime = clamp(time, 0, duration)
    setActiveClipEnd(null)
    if (videoRef.current) videoRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const updateClipRange = (start: number, end: number) => {
    const update = normalizeClipRangeUpdate({
      start,
      end,
      duration,
      maxDuration: MAX_CLIP_DURATION_SECONDS,
      previousStart: rangeStart,
      previousEnd: rangeEnd,
    })
    if (!update) return

    setRangeStart(update.start)
    setRangeEnd(update.end)
    if (update.previewTime != null) seekVideo(update.previewTime)
  }

  const markRangeStart = () => {
    if (duration <= 0) return
    setRangeStart(clamp(currentTime, 0, duration))
    setRangeEnd(null)
    setEditingClipId(null)
  }

  const markRangeEnd = () => {
    if (rangeStart == null || currentTime <= rangeStart) {
      toast.error('Avanzá el video después del inicio para marcar el fin')
      return
    }
    let end = currentTime
    if (end - rangeStart > MAX_CLIP_DURATION_SECONDS) {
      end = rangeStart + MAX_CLIP_DURATION_SECONDS
      toast.info('La jugada se ajustó al máximo de 30 segundos')
    }
    setRangeEnd(Math.min(end, duration))
  }

  const applyCurrentTime = (edge: 'start' | 'end') => {
    if (rangeStart == null || rangeEnd == null) return
    if (edge === 'start') updateClipRange(currentTime, rangeEnd)
    else updateClipRange(rangeStart, currentTime)
  }

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId])
  }

  const saveClipDraft = () => {
    const label = clipLabel.trim()
    if (rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) {
      toast.error('Marcá un inicio y un fin válidos')
      return
    }
    if (!label) {
      toast.error('Agregá una etiqueta')
      return
    }
    if (rangeEnd - rangeStart > MAX_CLIP_DURATION_SECONDS) {
      toast.error('Cada clip puede durar como máximo 30 segundos')
      return
    }

    const nextClip: WorkspaceClip = {
      id: editingClipId ?? `clip-${crypto.randomUUID().slice(0, 8)}`,
      label,
      startSecond: rangeStart,
      endSecond: rangeEnd,
      note: clipNote.trim() || undefined,
      playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
    }

    setClips((current) => editingClipId
      ? current.map((clip) => clip.id === editingClipId ? nextClip : clip)
      : [...current, nextClip])
    markUnsaved()
    clearRangeDraft()
  }

  const playClip = (clip: WorkspaceClip) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = clip.startSecond
    setCurrentTime(clip.startSecond)
    setActiveClipEnd(clip.endSecond)
    void videoRef.current.play().catch(() => undefined)
  }

  const editClip = (clip: WorkspaceClip) => {
    setEditingClipId(clip.id)
    setRangeStart(clip.startSecond)
    setRangeEnd(clip.endSecond)
    setClipLabel(clip.label)
    setClipNote(clip.note ?? '')
    setSelectedPlayerIds(clip.playerIds ?? [])
    seekVideo(clip.startSecond)
  }

  const removeClip = (clip: WorkspaceClip) => {
    if (!window.confirm(`¿Eliminar el borrador “${clip.label}”?`)) return
    setClips((current) => current.filter((item) => item.id !== clip.id))
    if (editingClipId === clip.id) clearRangeDraft()
    markUnsaved()
  }

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (activeClipEnd != null && video.currentTime >= activeClipEnd) {
      video.pause()
      setActiveClipEnd(null)
    }
  }

  const saveAnalysis = async () => {
    if (!preparedSetup) return
    if (clips.length === 0) {
      toast.error('Guardá al menos un clip antes de guardar el análisis')
      return
    }

    let persistenceStarted = false
    try {
      setSaveState('saving')
      setSaveError('')
      const collection = await clipCollectionService.create(preparedSetup.video.id, {
        name: preparedSetup.analysisName,
        description: `Clips creados desde el análisis ${preparedSetup.analysisName}`,
      })
      persistenceStarted = true
      await clipCollectionService.addClips(
        preparedSetup.video.id,
        collection.id,
        clips.map((clip) => ({
          startMs: Math.round(clip.startSecond * 1000),
          endMs: Math.round(clip.endSecond * 1000),
          description: clip.label.trim() || undefined,
        })),
      )

      if (!isMockApiEnabled) {
        setSaveState('saved')
        toast.success(`${clips.length} clips guardados`)
        navigationTimerRef.current = window.setTimeout(() => {
          navigate(`/videos/${preparedSetup.video.id}/colecciones/${collection.id}`)
        }, SAVED_ACKNOWLEDGEMENT_MS)
        return
      }

      const relatedPlayerIds = [...new Set(clips.flatMap((clip) => clip.playerIds ?? []))]
      const session = await analysisService.saveManualAnalysis({
        name: preparedSetup.analysisName,
        video: { ...preparedSetup.video, storageUrl: videoUrl || preparedSetup.video.storageUrl },
        clipCollectionId: collection.id,
        team: preparedSetup.team,
        rivalTeam: preparedSetup.rivalTeam,
        teamId: preparedSetup.team.id,
        rivalTeamId: preparedSetup.rivalTeam?.id,
        playerIds: relatedPlayerIds,
        clips,
      })

      if (ownedVideoUrlRef.current === videoUrl) ownedVideoUrlRef.current = ''
      setSaveState('saved')
      toast.success(`Análisis y ${clips.length} clips guardados`)
      navigationTimerRef.current = window.setTimeout(() => {
        navigate(`/analisis/${session.id}`)
      }, SAVED_ACKNOWLEDGEMENT_MS)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el análisis'
      setSaveError(message)
      setSaveState(persistenceStarted ? 'partial-failure' : 'unsaved')
      toast.error(message)
    }
  }

  if (!preparedSetup || editingSetup) {
    return (
      <AnalysisSetup
        initialValue={preparedSetup}
        lockMaterial={clips.length > 0}
        onStart={handlePreparedSetup}
        onCancel={preparedSetup ? () => setEditingSetup(false) : undefined}
      />
    )
  }

  return (
    <AnalysisWorkspace
      preparedSetup={preparedSetup}
      videoRef={videoRef}
      videoUrl={videoUrl}
      duration={duration}
      currentTime={currentTime}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      clipLabel={clipLabel}
      clipNote={clipNote}
      selectedPlayerIds={selectedPlayerIds}
      players={players}
      playersUnavailable={playersUnavailable}
      clips={clips}
      editingClipId={editingClipId}
      saveState={saveState}
      saveError={saveError}
      onEditSetup={() => setEditingSetup(true)}
      onSaveAnalysis={() => void saveAnalysis()}
      onLoadedMetadata={(nextDuration) => setDuration(nextDuration)}
      onTimeUpdate={handleVideoTimeUpdate}
      onSeek={seekVideo}
      onRangeChange={updateClipRange}
      onMarkStart={markRangeStart}
      onMarkEnd={markRangeEnd}
      onClearRange={clearRangeDraft}
      onClipLabelChange={setClipLabel}
      onClipNoteChange={setClipNote}
      onTogglePlayer={togglePlayer}
      onSaveClip={saveClipDraft}
      onPlayClip={playClip}
      onEditClip={editClip}
      onRemoveClip={removeClip}
      onApplyCurrentTime={applyCurrentTime}
    />
  )
}
