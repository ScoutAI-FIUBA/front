import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Film, Loader2, Play, Plus, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { clipCollectionService, videoService } from '@/services/registry'
import type { ClipCollectionDetail, ClipCollectionItem, Video } from '@/types'

const MAX_CLIP_DURATION_SECONDS = 30

function formatSeconds(value: number): string {
  const minutes = Math.floor(Math.max(0, value) / 60)
  const seconds = Math.floor(Math.max(0, value) % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function VideoCollectionDetailPage() {
  const { videoId = '', collectionId = '' } = useParams()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [video, setVideo] = useState<Video | null>(null)
  const [detail, setDetail] = useState<ClipCollectionDetail | null>(null)
  const [selectedItem, setSelectedItem] = useState<ClipCollectionItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [startSeconds, setStartSeconds] = useState('0')
  const [endSeconds, setEndSeconds] = useState('10')
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [exportingId, setExportingId] = useState('')

  const load = useCallback(async () => {
    if (!videoId || !collectionId) return
    try {
      setLoading(true)
      setError('')
      const [videoData, collectionData] = await Promise.all([
        videoService.getById(videoId),
        clipCollectionService.getDetail(videoId, collectionId),
      ])
      setVideo(videoData)
      setDetail(collectionData)
      setSelectedItem((current) => (
        collectionData.items.find((item) => item.id === current?.id)
        ?? collectionData.items[0]
        ?? null
      ))
      if (!videoData) setError('No se encontró el video solicitado.')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la colección.')
    } finally {
      setLoading(false)
    }
  }, [videoId, collectionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!video) return
    setStartSeconds('0')
    setEndSeconds(String(Math.min(MAX_CLIP_DURATION_SECONDS, (video.durationMs ?? 10_000) / 1000)))
    setActiveClipEnd(null)
  }, [video])

  const handleAdd = async () => {
    const start = Number(startSeconds)
    const end = Number(endSeconds)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
      toast.error('Ingresá tiempos válidos para el clip')
      return
    }
    if (end <= start) {
      toast.error('El fin debe ser mayor que el inicio')
      return
    }
    if (end - start > MAX_CLIP_DURATION_SECONDS) {
      toast.error('Cada clip puede durar como máximo 30 segundos')
      return
    }
    if (video?.durationMs != null && end * 1000 > video.durationMs) {
      toast.error('El rango no puede superar la duración del video')
      return
    }
    try {
      setSaving(true)
      const item = await clipCollectionService.addClip(videoId, collectionId, {
        startMs: Math.round(start * 1000),
        endMs: Math.round(end * 1000),
      })
      setAddOpen(false)
      setSelectedItem(item)
      toast.success('Clip agregado')
      await load()
    } catch (addError) {
      toast.error(addError instanceof Error ? addError.message : 'No se pudo agregar el clip')
    } finally {
      setSaving(false)
    }
  }

  const applyCurrentTime = (setter: (value: string) => void) => {
    setter(String(Math.round((videoRef.current?.currentTime ?? 0) * 10) / 10))
  }

  const playItem = (item: ClipCollectionItem) => {
    setSelectedItem(item)
    const player = videoRef.current
    if (!player) return
    player.currentTime = item.startMs / 1000
    setActiveClipEnd(item.endMs / 1000)
    void player.play().catch(() => undefined)
  }

  const handleVideoTimeUpdate = () => {
    const player = videoRef.current
    if (!player || activeClipEnd == null || player.currentTime < activeClipEnd) return
    player.pause()
    setActiveClipEnd(null)
  }

  const handleExport = async (item: ClipCollectionItem) => {
    try {
      setExportingId(item.id)
      const downloadUrl = await clipCollectionService.exportClip(videoId, collectionId, item.id)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `clip-${item.position}.mp4`
      link.target = '_blank'
      link.rel = 'noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Clip preparado para descargar')
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'No se pudo preparar la descarga')
    } finally {
      setExportingId('')
    }
  }

  const handleDelete = async (item: ClipCollectionItem) => {
    if (!window.confirm(`¿Quitar el clip ${item.position} de la colección?`)) return
    try {
      setDeletingId(item.id)
      await clipCollectionService.deleteClip(videoId, collectionId, item.id)
      toast.success('Clip eliminado')
      await load()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el clip')
    } finally {
      setDeletingId('')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando colección...</p>

  if (error || !detail || !video) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to={`/videos/${videoId}/colecciones`}>
            <ArrowLeft className="h-4 w-4" /> Volver a colecciones
          </Link>
        </Button>
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-sm text-destructive">
            {error || 'No se encontró la colección solicitada.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link to={`/videos/${videoId}/colecciones`}>
            <ArrowLeft className="h-4 w-4" /> Volver a colecciones
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">{video.title}</p>
            <h1 className="text-2xl font-bold">{detail.collection.name}</h1>
            <p className="text-sm text-muted-foreground">
              {detail.collection.description || 'Colección sin descripción'}
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Agregar clip</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar rango del video</DialogTitle>
                <DialogDescription>
                  Marcá un fragmento de hasta 30 segundos. Se usará el video original.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="clip-start">Inicio (segundos)</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        id="clip-start"
                        type="number"
                        min="0"
                        step="0.1"
                        value={startSeconds}
                        onChange={(event) => setStartSeconds(event.target.value)}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => applyCurrentTime(setStartSeconds)}>
                        Actual
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="clip-end">Fin (segundos)</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        id="clip-end"
                        type="number"
                        min="0"
                        step="0.1"
                        value={endSeconds}
                        onChange={(event) => setEndSeconds(event.target.value)}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => applyCurrentTime(setEndSeconds)}>
                        Actual
                      </Button>
                    </div>
                  </div>
                </div>
                <Button className="w-full" disabled={saving} onClick={() => void handleAdd()}>
                  {saving ? 'Guardando...' : 'Agregar clip'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Reproductor</CardTitle></CardHeader>
          <CardContent>
            {video.storageUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border bg-black">
                  <video
                    ref={videoRef}
                    key={video.id}
                    src={video.storageUrl}
                    controls
                    className="aspect-video w-full"
                    onTimeUpdate={handleVideoTimeUpdate}
                  />
                </div>
                {selectedItem ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Clip {selectedItem.position}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSeconds(selectedItem.startMs / 1000)}–{formatSeconds(selectedItem.endMs / 1000)} · {formatDate(selectedItem.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exportingId === selectedItem.id}
                      onClick={() => void handleExport(selectedItem)}
                    >
                      {exportingId === selectedItem.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                      {exportingId === selectedItem.id ? 'Preparando...' : 'Descargar clip'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Reproducí el video y usá el tiempo actual para definir el primer rango.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg border bg-accent/30 text-center">
                <div>
                  <Film className="mx-auto mb-3 h-10 w-10 text-primary/40" />
                  <p className="font-medium">Video no disponible</p>
                  <p className="text-sm text-muted-foreground">No se pudo cargar el video original.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Clips</CardTitle>
            <span className="text-xs text-muted-foreground">{detail.items.length} total</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 rounded-lg border p-3 ${
                  selectedItem?.id === item.id ? 'border-primary bg-accent/50' : ''
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => playItem(item)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                    <Play className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">Clip {item.position}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatSeconds(item.startMs / 1000)}–{formatSeconds(item.endMs / 1000)}
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={exportingId === item.id}
                  aria-label={`Descargar clip ${item.position}`}
                  onClick={() => void handleExport(item)}
                >
                  {exportingId === item.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === item.id}
                  aria-label={`Eliminar clip ${item.position}`}
                  onClick={() => void handleDelete(item)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {detail.items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                La colección todavía está vacía.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
