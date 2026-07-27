import crypto from 'crypto'
import path from 'path'

/**
 * Génère des object keys prévisibles et non sensibles.
 * Structure :
 * ebooks/{ebookId}/original/book.pdf
 * ebooks/{ebookId}/preview/preview.pdf
 * ebooks/{ebookId}/covers/cover.{ext}
 * ebooks/{ebookId}/audio/full/chapter-001.mp3
 */
export function buildEbookObjectKey(ebookId, assetType, originalFilename = '') {
  const id = Number(ebookId)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('ebookId invalide pour object key')
  }

  const ext = sanitizeExtension(originalFilename, assetType)
  const base = `ebooks/${id}`

  switch (assetType) {
    case 'PDF':
      return `${base}/original/book.pdf`
    case 'EPUB':
      return `${base}/original/book.epub`
    case 'PDF_PREVIEW':
      return `${base}/preview/preview.pdf`
    case 'EPUB_PREVIEW':
      return `${base}/preview/preview.epub`
    case 'COVER':
      return `${base}/covers/cover${ext || '.jpg'}`
    case 'AUDIO_PREVIEW':
      return `${base}/audio/preview/preview${ext || '.mp3'}`
    case 'AUDIO_CHAPTER': {
      const chapter = String(Date.now()).slice(-3)
      return `${base}/audio/full/chapter-${chapter}${ext || '.mp3'}`
    }
    default:
      throw new Error(`Type d'asset inconnu: ${assetType}`)
  }
}

export function buildTestObjectKey() {
  return `test/${crypto.randomUUID()}.txt`
}

export function ebookPrefix(ebookId) {
  return `ebooks/${Number(ebookId)}/`
}

function sanitizeExtension(filename, assetType) {
  const raw = path.extname(String(filename || '')).toLowerCase()
  const allowed = {
    PDF: ['.pdf'],
    PDF_PREVIEW: ['.pdf'],
    EPUB: ['.epub'],
    EPUB_PREVIEW: ['.epub'],
    COVER: ['.jpg', '.jpeg', '.png', '.webp'],
    AUDIO_CHAPTER: ['.mp3', '.m4a'],
    AUDIO_PREVIEW: ['.mp3', '.m4a'],
  }
  const list = allowed[assetType] || []
  if (raw && list.includes(raw === '.jpeg' ? '.jpg' : raw)) {
    return raw === '.jpeg' ? '.jpg' : raw
  }
  return list[0] || ''
}
