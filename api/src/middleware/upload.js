import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { config } from '../config.js'
import { isR2Configured } from '../config/r2.js'
import { assetTypeFromField, validateUploadFile, FileValidationError } from '../services/storage/fileValidation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsRoot = path.join(__dirname, '../../uploads')

for (const dir of ['covers', 'pdfs']) {
  fs.mkdirSync(path.join(uploadsRoot, dir), { recursive: true })
}

const maxFileMb = Math.max(
  config.r2.maxPdfSizeMb,
  config.r2.maxEpubSizeMb,
  config.r2.maxCoverSizeMb,
  config.r2.maxAudioSizeMb
)

function fileFilter(req, file, cb) {
  try {
    const assetType = assetTypeFromField(file.fieldname)
    if (!assetType) {
      return cb(new Error(`Champ fichier inconnu: ${file.fieldname}`))
    }
    validateUploadFile({
      assetType,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: undefined, // size known after upload
    })
    cb(null, true)
  } catch (err) {
    cb(err instanceof FileValidationError ? err : new Error(err.message))
  }
}

/** Mémoire — pour upload vers R2 (pas de disque Railway). */
export const uploadEbookFilesMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: maxFileMb * 1024 * 1024 },
}).fields([
  { name: 'pdf_file', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
  { name: 'epub_file', maxCount: 1 },
  { name: 'preview_pdf', maxCount: 1 },
  { name: 'preview_epub', maxCount: 1 },
  { name: 'audio_file', maxCount: 1 },
  { name: 'audio_preview', maxCount: 1 },
])

/** Disque — fallback local si R2 non configuré. */
const diskStorage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = file.fieldname === 'pdf_file' ? 'pdfs' : 'covers'
    cb(null, path.join(uploadsRoot, folder))
  },
  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')
    cb(null, `${unique}${ext}`)
  },
})

export const uploadEbookFilesDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: 'pdf_file', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
])

/** Middleware dynamique selon config R2. */
export function uploadEbookFiles(req, res, next) {
  const handler = isR2Configured() ? uploadEbookFilesMemory : uploadEbookFilesDisk
  handler(req, res, (err) => {
    if (err) {
      const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 422)
      return res.status(status).json({
        message: err.message || 'Erreur upload',
      })
    }
    next()
  })
}

export const uploadsPath = uploadsRoot
export { isR2Configured }
