import type {
  ClipCollection,
  ClipCollectionDetail,
  ClipCollectionItem,
} from '@/types'

export interface CreateClipCollectionDto {
  name: string
  description?: string
}

export interface AddClipDto {
  filename: string
  cloudflareUrl: string
}

export interface IClipCollectionService {
  list(videoId: string): Promise<ClipCollection[]>
  getDetail(videoId: string, collectionId: string): Promise<ClipCollectionDetail>
  create(videoId: string, dto: CreateClipCollectionDto): Promise<ClipCollection>
  addClip(videoId: string, collectionId: string, dto: AddClipDto): Promise<ClipCollectionItem>
  addClips(videoId: string, collectionId: string, clips: AddClipDto[]): Promise<ClipCollectionItem[]>
  deleteClip(videoId: string, collectionId: string, itemId: string): Promise<void>
}
