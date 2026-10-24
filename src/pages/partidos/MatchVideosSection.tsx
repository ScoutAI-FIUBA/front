import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, Link2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { videoService } from '@/services/registry'
import type { MatchRecord, Video } from '@/types'
import { matchErrorCopy } from './match-import'
import {
  MOVE_CONFIRMATION,
  OTHER_MATCH_LABEL,
  THIS_MATCH_LABEL,
  VIDEOS_EMPTY,
  VIDEOS_NOTE,
  linkCandidates,
  linkedVideos,
} from './match-videos'

type LoadState = 'loading' | 'error' | 'success'

function uploadDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function videoPath(id: string): string {
  return `/videos/${encodeURIComponent(id)}`
}

export function MatchVideosSection({
  match,
  homeName,
  awayName,
}: {
  match: MatchRecord
  homeName: string
  awayName: string
}) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [videos, setVideos] = useState<Video[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [confirmedMove, setConfirmedMove] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null)
  const busyRef = useRef(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const [home, away] = await Promise.all([
        videoService.filterByTeam(match.homeTeamId),
        match.awayTeamId === match.homeTeamId
          ? Promise.resolve([] as Video[])
          : videoService.filterByTeam(match.awayTeamId),
      ])
      if (!activeRef.current) return
      setVideos([...home, ...away])
      setLoadState('success')
    } catch {
      if (activeRef.current) setLoadState('error')
    }
  }, [match.homeTeamId, match.awayTeamId])

  useEffect(() => {
    void load()
  }, [load])

  const teamNames = useMemo(
    () => ({ [match.homeTeamId]: homeName, [match.awayTeamId]: awayName }),
    [match.homeTeamId, match.awayTeamId, homeName, awayName],
  )
  const linked = useMemo(() => linkedVideos(match, videos), [match, videos])
  const candidates = useMemo(() => linkCandidates(match, videos), [match, videos])
  const selected = candidates.find((candidate) => candidate.video.id === selectedId)
  const needsMoveConfirmation = selected?.state === 'other-match'

  const replaceVideo = (updated: Video) => {
    setVideos((current) => current.map((video) => (video.id === updated.id ? { ...video, linkedMatchId: updated.linkedMatchId } : video)))
  }

  const openDialog = () => {
    setSelectedId('')
    setConfirmedMove(false)
    setDialogError(null)
    setDialogOpen(true)
  }

  const runSetMatch = async (video: Video, matchId: string | null, successMessage: string): Promise<boolean> => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusyVideoId(video.id)
    try {
      const updated = await videoService.setMatch(video.id, video.teamId, matchId)
      if (!activeRef.current) return true
      replaceVideo(updated)
      toast.success(successMessage)
      return true
    } catch (error) {
      if (activeRef.current) {
        const copy = matchErrorCopy(error)
        if (matchId === null) toast.error(`No pudimos desvincular el video. ${copy.description}`)
        else setDialogError(copy.description)
      }
      return false
    } finally {
      busyRef.current = false
      if (activeRef.current) setBusyVideoId(null)
    }
  }

  const confirmLink = async () => {
    if (!selected || selected.state === 'this-match') return
    if (needsMoveConfirmation && !confirmedMove) return
    setDialogError(null)
    const ok = await runSetMatch(selected.video, match.id, 'Video vinculado')
    if (ok && activeRef.current) setDialogOpen(false)
  }

  const submitting = busyVideoId !== null
  const neitherTeamHasVideos = loadState === 'success' && videos.length === 0

  return (
    <section aria-labelledby="match-videos-title" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="match-videos-title" className="text-lg font-semibold text-foreground">Videos del partido</h2>
          <p className="mt-1 text-sm text-muted-foreground">{VIDEOS_NOTE}</p>
        </div>
        {loadState === 'success' && !neitherTeamHasVideos ? (
          <Button type="button" variant="outline" onClick={openDialog}>
            <Link2 aria-hidden="true" className="h-4 w-4" />
            Vincular video
          </Button>
        ) : null}
      </div>

      {loadState === 'loading' ? (
        <p role="status" className="text-sm text-muted-foreground">Cargando videos…</p>
      ) : null}

      {loadState === 'error' ? (
        <Alert className="flex flex-col gap-3 border-destructive/30 bg-destructive/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <CircleAlert aria-hidden="true" className="h-4 w-4" />
            No pudimos cargar los videos
          </div>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Reintentar
          </Button>
        </Alert>
      ) : null}

      {neitherTeamHasVideos ? (
        <div className="rounded-lg border border-border-strong bg-surface p-4 text-sm">
          <p className="font-medium text-foreground">Ninguno de los equipos tiene videos todavía</p>
          <Button asChild variant="link" className="mt-1 h-auto p-0">
            <Link to="/videos/subir">Subir un video</Link>
          </Button>
        </div>
      ) : null}

      {loadState === 'success' && !neitherTeamHasVideos && linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">{VIDEOS_EMPTY}</p>
      ) : null}

      {linked.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border-strong bg-surface">
          {linked.map((video) => (
            <li key={video.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{video.title || 'Video sin título'}</p>
                <p className="text-xs text-muted-foreground">
                  {teamNames[video.teamId] ?? 'Equipo no disponible'} · {uploadDate(video.uploadedAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={videoPath(video.id)} aria-label={`Abrir video ${video.title}`}>Abrir video</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  aria-label={`Desvincular ${video.title}`}
                  onClick={() => void runSetMatch(video, null, 'Video desvinculado')}
                >
                  {busyVideoId === video.id ? 'Desvinculando…' : 'Desvincular'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!submitting) setDialogOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular video</DialogTitle>
            <DialogDescription>
              Elegí un video de {homeName} o de {awayName}. {VIDEOS_NOTE}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="match-video-select">Video</Label>
            <Select
              value={selectedId}
              onValueChange={(value) => {
                setSelectedId(value)
                setConfirmedMove(false)
                setDialogError(null)
              }}
              disabled={submitting}
            >
              <SelectTrigger id="match-video-select" className="mt-1">
                <SelectValue placeholder="Elegí un video" />
              </SelectTrigger>
              <SelectContent>
                {([['HOME', homeName], ['AWAY', awayName]] as const).map(([side, name]) => {
                  const items = candidates.filter((candidate) => candidate.side === side)
                  if (items.length === 0) return null
                  return (
                    <SelectGroup key={side}>
                      <SelectLabel>{name}</SelectLabel>
                      {items.map(({ video, state }) => (
                        <SelectItem key={video.id} value={video.id} disabled={state === 'this-match'}>
                          {video.title || 'Video sin título'}
                          {state === 'other-match' ? ` · ${OTHER_MATCH_LABEL}` : ''}
                          {state === 'this-match' ? ` · ${THIS_MATCH_LABEL}` : ''}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                })}
              </SelectContent>
            </Select>
            {candidates.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No hay videos disponibles para vincular.</p>
            ) : null}
          </div>

          {needsMoveConfirmation ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={confirmedMove}
                disabled={submitting}
                onChange={(event) => setConfirmedMove(event.target.checked)}
              />
              <span>
                <span className="block font-medium">{OTHER_MATCH_LABEL}</span>
                <span className="block">{MOVE_CONFIRMATION}</span>
              </span>
            </label>
          ) : null}

          {dialogError ? <p role="alert" className="text-sm text-destructive">{dialogError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={submitting} onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!selected || submitting || (needsMoveConfirmation && !confirmedMove)}
              onClick={() => void confirmLink()}
            >
              {submitting ? 'Vinculando…' : needsMoveConfirmation ? 'Mover y vincular' : 'Vincular'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
