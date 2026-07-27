import { api } from './client'

/**
 * URL d'affichage pour la couverture d'un ebook.
 * Préfixe toujours avec VITE_API_URL (prod) ou l'origine (dev proxy).
 */
export function getCoverImageUrl(coverImageUrl: string | null | undefined): string {
  if (!coverImageUrl) return ''

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const origin =
    typeof window !== 'undefined' ? window.location.origin : ''

  // URL absolue (anciennes réponses API avec APP_URL)
  if (coverImageUrl.startsWith('http')) {
    try {
      const u = new URL(coverImageUrl)
      // Toujours réécrire le host vers l'API réelle (APP_URL localhost en prod)
      if (apiBase) return `${apiBase}${u.pathname}${u.search}`
      return `${origin}${u.pathname}${u.search}`
    } catch {
      return coverImageUrl
    }
  }

  const path = coverImageUrl.startsWith('/') ? coverImageUrl : `/${coverImageUrl}`
  return `${(apiBase || origin).replace(/\/$/, '')}${path}`
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
}

export interface Ebook {
  id: number
  title: string
  slug: string
  author: string
  description: string
  isbn?: string
  cover_image_url: string
  pdf_file_path: string
  pdf_file_size: number
  total_pages: number
  preview_pages: number
  published_at: string | null
  is_featured: boolean
  is_active: boolean
  categories?: Category[]
}

export interface EbooksResponse {
  data: Ebook[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export async function getEbooks(params?: {
  page?: number
  per_page?: number
  search?: string
  category_id?: number
  featured?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}): Promise<EbooksResponse> {
  const { data } = await api.get<EbooksResponse>('/ebooks', { params })
  return data
}

export async function getEbook(id: number): Promise<Ebook> {
  const { data } = await api.get<Ebook>(`/ebooks/${id}`)
  return data
}

export interface CategoryWithCount extends Category {
  ebooks_count: number
}

export async function getCategories(): Promise<CategoryWithCount[]> {
  const { data } = await api.get<CategoryWithCount[]>('/categories')
  return data
}

export class PdfLoadError extends Error {
  constructor(
    message: string,
    public code?: 'FORBIDDEN' | 'NOT_FOUND' | 'UNKNOWN'
  ) {
    super(message)
    this.name = 'PdfLoadError'
  }
}

export async function getPdfBlob(ebookId: number): Promise<Blob> {
  try {
    const { data } = await api.get<Blob>(`/ebooks/${ebookId}/stream`, { responseType: 'blob' })
    if (data instanceof Blob && data.type?.includes('application/json')) {
      const text = await data.text()
      const json = JSON.parse(text) as { message?: string }
      throw new PdfLoadError(json.message ?? 'Erreur serveur', 'UNKNOWN')
    }
    return data
  } catch (err: unknown) {
    if (err instanceof PdfLoadError) throw err
    const status = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined
    if (status === 403) {
      throw new PdfLoadError('Un abonnement actif est requis pour lire ce livre.', 'FORBIDDEN')
    }
    if (status === 404) {
      throw new PdfLoadError('Fichier PDF non disponible.', 'NOT_FOUND')
    }
    throw new PdfLoadError('Impossible de charger le PDF.', 'UNKNOWN')
  }
}

/**
 * Récupère le PDF (aperçu ou complet) en blob et retourne une object URL.
 * Penser à appeler URL.revokeObjectURL(url) quand on n'en a plus besoin.
 */
export async function getPdfBlobUrl(ebookId: number, preview: boolean): Promise<string> {
  const endpoint = preview ? `/ebooks/${ebookId}/preview` : `/ebooks/${ebookId}/stream`
  try {
    const { data } = await api.get<Blob>(endpoint, { responseType: 'blob' })
    if (data instanceof Blob && data.type?.includes('application/json')) {
      const text = await data.text()
      const json = JSON.parse(text) as { message?: string }
      throw new PdfLoadError(json.message ?? 'Erreur serveur', 'UNKNOWN')
    }
    return URL.createObjectURL(data)
  } catch (err: unknown) {
    if (err instanceof PdfLoadError) throw err
    const status = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined
    if (status === 403) {
      throw new PdfLoadError('Un abonnement actif est requis pour lire ce livre.', 'FORBIDDEN')
    }
    if (status === 404) {
      throw new PdfLoadError('Fichier PDF non disponible.', 'NOT_FOUND')
    }
    throw new PdfLoadError('Impossible de charger le PDF.', 'UNKNOWN')
  }
}
