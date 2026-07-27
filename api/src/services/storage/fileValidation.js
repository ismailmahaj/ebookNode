import path from 'path'
import { config } from '../../config.js'

/** Types génériques souvent envoyés par navigateurs / OS (extension déjà vérifiée). */
const GENERIC_MIMES = new Set(['application/octet-stream', 'binary/octet-stream', ''])

const ALLOWED = {
  PDF: {
    extensions: ['.pdf'],
    mimes: ['application/pdf', 'application/x-pdf'],
    maxMb: () => config.r2.maxPdfSizeMb,
  },
  PDF_PREVIEW: {
    extensions: ['.pdf'],
    mimes: ['application/pdf', 'application/x-pdf'],
    maxMb: () => config.r2.maxPdfSizeMb,
  },
  EPUB: {
    extensions: ['.epub'],
    mimes: ['application/epub+zip', 'application/octet-stream'],
    maxMb: () => config.r2.maxEpubSizeMb,
  },
  EPUB_PREVIEW: {
    extensions: ['.epub'],
    mimes: ['application/epub+zip', 'application/octet-stream'],
    maxMb: () => config.r2.maxEpubSizeMb,
  },
  COVER: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/x-png'],
    maxMb: () => config.r2.maxCoverSizeMb,
  },
  AUDIO_CHAPTER: {
    extensions: ['.mp3', '.m4a'],
    mimes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'],
    maxMb: () => config.r2.maxAudioSizeMb,
  },
  AUDIO_PREVIEW: {
    extensions: ['.mp3', '.m4a'],
    mimes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'],
    maxMb: () => config.r2.maxAudioSizeMb,
  },
}

const BLOCKED_EXTENSIONS = [
  '.exe', '.sh', '.bat', '.cmd', '.js', '.html', '.htm', '.svg',
  '.php', '.py', '.jar', '.dll', '.msi', '.zip', '.rar', '.7z',
]

export class FileValidationError extends Error {
  constructor(message, status = 422) {
    super(message)
    this.name = 'FileValidationError'
    this.status = status
  }
}

/**
 * Ne garde que le nom de fichier (sans chemin Windows/Unix).
 * Certains navigateurs envoient un chemin complet dans originalname.
 */
export function sanitizeOriginalName(originalname) {
  if (!originalname || typeof originalname !== 'string') {
    throw new FileValidationError('Nom de fichier manquant')
  }

  const base = path.posix.basename(originalname.replace(/\\/g, '/'))
  const cleaned = base.replace(/[\x00-\x1f]/g, '').trim()

  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new FileValidationError('Nom de fichier invalide')
  }

  return cleaned
}

export function validateUploadFile({ assetType, originalname, mimetype, size }) {
  const rules = ALLOWED[assetType]
  if (!rules) {
    throw new FileValidationError(`Type d'asset non autorisé: ${assetType}`)
  }

  const safeName = sanitizeOriginalName(originalname)
  const lower = safeName.toLowerCase()

  const ext = path.extname(lower)
  if (!ext) {
    throw new FileValidationError('Extension de fichier manquante')
  }

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new FileValidationError('Format de fichier non autorisé')
  }

  // Double extension suspecte (ex: book.pdf.exe)
  const parts = lower.split('.')
  if (parts.length > 2) {
    const maybeBlocked = `.${parts[parts.length - 2]}`
    if (BLOCKED_EXTENSIONS.includes(maybeBlocked)) {
      throw new FileValidationError('Extension double suspecte')
    }
  }

  const normalizedExt = ext === '.jpeg' ? '.jpg' : ext
  const allowedExts = rules.extensions.map((e) => (e === '.jpeg' ? '.jpg' : e))
  if (!allowedExts.includes(normalizedExt) && !allowedExts.includes(ext)) {
    throw new FileValidationError(
      `Extension non autorisée pour ${assetType}. Attendu: ${rules.extensions.join(', ')}`
    )
  }

  const mime = (mimetype || '').toLowerCase().trim()
  const mimeOk =
    rules.mimes.includes(mime) ||
    // Après contrôle d'extension : accepter les MIME génériques (souvent PDF/images)
    GENERIC_MIMES.has(mime)

  if (!mimeOk) {
    throw new FileValidationError(
      `Type MIME non autorisé (${mimetype || 'inconnu'}) pour ${assetType}`
    )
  }

  const maxBytes = rules.maxMb() * 1024 * 1024
  if (typeof size === 'number' && size > maxBytes) {
    throw new FileValidationError(
      `Fichier trop volumineux (max ${rules.maxMb()} Mo)`,
      413
    )
  }

  if (typeof size === 'number' && size <= 0) {
    throw new FileValidationError('Fichier vide')
  }

  const contentType =
    rules.mimes.includes(mime) && mime
      ? mime
      : rules.mimes[0]

  return {
    extension: normalizedExt,
    maxBytes,
    contentType,
    safeName,
  }
}

export function assetTypeFromField(fieldname) {
  const map = {
    pdf_file: 'PDF',
    cover_image: 'COVER',
    epub_file: 'EPUB',
    preview_pdf: 'PDF_PREVIEW',
    preview_epub: 'EPUB_PREVIEW',
    audio_file: 'AUDIO_CHAPTER',
    audio_preview: 'AUDIO_PREVIEW',
  }
  return map[fieldname] || null
}
