import { config } from '../config.js'
import path from 'path'

export function fileUrl(relativePath) {
  if (!relativePath) return ''
  if (relativePath.startsWith('http')) return relativePath
  const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${config.appUrl}${normalized}`
}

export function formatCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    image_url: row.image_url ? fileUrl(row.image_url) : undefined,
  }
}

export function formatEbook(row, categories = []) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    author: row.author,
    description: row.description,
    isbn: row.isbn || undefined,
    cover_image_url: row.cover_image_path.startsWith('/')
      ? row.cover_image_path
      : fileUrl(row.cover_image_path),
    pdf_file_path: row.pdf_file_path,
    pdf_file_size: Number(row.pdf_file_size),
    total_pages: row.total_pages,
    preview_pages: row.preview_pages,
    published_at: row.published_at
      ? new Date(row.published_at).toISOString().slice(0, 10)
      : null,
    is_featured: row.is_featured,
    is_active: row.is_active,
    categories,
    ...(row.total_views !== undefined ? { total_views: row.total_views } : {}),
  }
}

export async function loadCategoriesForEbooks(query, ebookIds) {
  if (!ebookIds.length) return new Map()
  const { rows } = await query(
    `SELECT ec.ebook_id, c.id, c.name, c.slug, c.description, c.image_url
     FROM ebook_category ec
     JOIN categories c ON c.id = ec.category_id
     WHERE ec.ebook_id = ANY($1)
     ORDER BY c.name`,
    [ebookIds]
  )
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.ebook_id)) map.set(row.ebook_id, [])
    map.get(row.ebook_id).push(formatCategory(row))
  }
  return map
}

export function validationError(res, errors, message = 'Erreur de validation') {
  return res.status(422).json({ message, errors })
}

export function parseCategoryIds(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean)
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : []
  } catch {
    return []
  }
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
export const ALLOWED_PDF_TYPE = 'application/pdf'

export function extFromMimetype(mimetype) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
  }
  return map[mimetype] || path.extname(mimetype)
}
