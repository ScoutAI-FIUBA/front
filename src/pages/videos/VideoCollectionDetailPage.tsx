import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Film, Play, Plus, Trash2 } from 'lucide-react'
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

export function VideoCollectionDetailPage() {
  const { videoId = '', collectionId = '' } = useParams()
  const [video, setVideo] = useState<Video | null>(null)
  const [detail, setDetail] = useState<ClipCollectionDetail | null>(null)
  const [selectedItem, setSelectedItem] = useState<ClipCollectionItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [filename, setFilename] = useState('')
  const [cloudflareUrl, setCloudflareUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

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

  const handleAdd = async () => {
    const trimmedFilename = filename.trim()
    const trimmedUrl = cloudflareUrl.trim()
    if (!trimmedFilename || !trimmedUrl) {
      toast.error('Completá el nombre del archivo y la URL')
      return
    }
    try {
      const parsedUrl = new URL(trimmedUrl)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
    } catch {
      toast.error('Ingresá una URL HTTP o HTTPS válida')
      return
    }
    try {
      setSaving(true)
      const item = await clipCollectionService.addClip(videoId, collectionId, {
        filename: trimmedFilename,
        cloudflareUrl: trimmedUrl,
      })
      setFilename('')
      setCloudflareUrl('')
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

  const handleDelete = async (item: ClipCollectionItem) => {
    if (!window.confirm(`¿Quitar ${item.filename} de la colección?`)) return
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
                <DialogTitle>Agregar clip existente</DialogTitle>
                <DialogDescription>
                  Ingresá los datos de un archivo que ya esté disponible en Cloudflare.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clip-filename">Nombre del archivo</Label>
                  <Input
                    id="clip-filename"
                    maxLength={512}
                    value={filename}
                    onChange={(event) => setFilename(event.target.value)}
                    placeholder="Ej. gol-final.mp4"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="clip-url">URL de Cloudflare</Label>
                  <Input
                    id="clip-url"
                    type="url"
                    maxLength={2048}
                    value={cloudflareUrl}
                    onChange={(event) => setCloudflareUrl(event.target.value)}
                    placeholder="https://cdn.example.com/gol-final.mp4"
                    className="mt-1"
                  />
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
            {selectedItem ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border bg-black">
                  <video
                    key={selectedItem.id}
                    src={selectedItem.cloudflareUrl}
                    controls
                    className="aspect-video w-full"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{selectedItem.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Posición {selectedItem.position} · Agregado el {formatDate(selectedItem.createdAt)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedItem.cloudflareUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Abrir archivo
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg border bg-accent/30 text-center">
                <div>
                  <Film className="mx-auto mb-3 h-10 w-10 text-primary/40" />
                  <p className="font-medium">No hay clips para reproducir</p>
                  <p className="text-sm text-muted-foreground">Agregá una URL para comenzar.</p>
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
                  onClick={() => setSelectedItem(item)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                    <Play className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.filename}</span>
                    <span className="block text-xs text-muted-foreground">Posición {item.position}</span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === item.id}
                  aria-label={`Eliminar ${item.filename}`}
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
