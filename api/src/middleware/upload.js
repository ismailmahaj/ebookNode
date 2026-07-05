import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsRoot = path.join(__dirname, '../../uploads')

for (const dir of ['covers', 'pdfs']) {
  fs.mkdirSync(path.join(uploadsRoot, dir), { recursive: true })
}

const storage = multer.diskStorage({
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

function fileFilter(req, file, cb) {
  if (file.fieldname === 'pdf_file') {
    if (file.mimetype === 'application/pdf') return cb(null, true)
    return cb(new Error('Le fichier PDF doit être au format .pdf'))
  }
  if (file.fieldname === 'cover_image') {
    if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) return cb(null, true)
    return cb(new Error('La couverture doit être JPEG ou PNG'))
  }
  cb(null, true)
}

export const uploadEbookFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: 'pdf_file', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
])

export const uploadsPath = uploadsRoot
