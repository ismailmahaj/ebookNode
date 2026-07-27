import { Router } from 'express'
import { query } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { uploadEbookFilesMemory } from '../middleware/upload.js'
import { isR2Configured } from '../config/r2.js'
import {
  listAssets,
  uploadEbookAsset,
  createPresignedUpload,
  confirmPresignedUpload,
  softDeleteAsset,
  getAsset,
} from '../services/ebookAssetService.js'
import { assetTypeFromField, FileValidationError } from '../services/storage/fileValidation.js'
import { listObjectsByPrefix, deleteObjects } from '../services/storage/r2StorageService.js'
import { ebookPrefix } from '../services/storage/objectKeys.js'

const router = Router()
router.use(authenticate, requireAdmin)

async function ensureEbook(id) {
  const { rows } = await query('SELECT * FROM ebooks WHERE id = $1', [id])
  if (!rows.length) {
    const err = new Error('Ebook introuvable')
    err.status = 404
    throw err
  }
  return rows[0]
}

function requireR2(res) {
  if (!isR2Configured()) {
    res.status(503).json({ message: 'Stockage R2 non configuré sur le serveur' })
    return false
  }
  return true
}

router.get('/ebooks/:ebookId/assets', async (req, res, next) => {
  try {
    await ensureEbook(req.params.ebookId)
    const assets = await listAssets(req.params.ebookId)
    res.json({ data: assets })
  } catch (err) {
    next(err)
  }
})

/** Upload multipart direct (mémoire → R2) */
router.post('/ebooks/:ebookId/assets/upload', (req, res) => {
  if (!requireR2(res)) return

  uploadEbookFilesMemory(req, res, async (err) => {
    if (err) {
      const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 422)
      return res.status(status).json({ message: err.message })
    }

    try {
      await ensureEbook(req.params.ebookId)
      const uploadedBy = req.user.id
      const results = []

      const fieldMap = [
        'pdf_file',
        'cover_image',
        'epub_file',
        'preview_pdf',
        'preview_epub',
        'audio_file',
        'audio_preview',
      ]

      for (const field of fieldMap) {
        const file = req.files?.[field]?.[0]
        if (!file) continue
        const assetType = assetTypeFromField(field)
        const asset = await uploadEbookAsset({
          ebookId: Number(req.params.ebookId),
          assetType,
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy,
        })
        results.push(asset)
      }

      if (!results.length) {
        return res.status(422).json({ message: 'Aucun fichier fourni' })
      }

      res.status(201).json({ data: results })
    } catch (e) {
      const status = e.status || (e instanceof FileValidationError ? e.status : 500)
      res.status(status).json({ message: e.message || 'Erreur upload' })
    }
  })
})

/** Presign upload (gros fichiers / audio) */
router.post('/ebooks/:ebookId/assets/presign-upload', async (req, res, next) => {
  try {
    if (!requireR2(res)) return
    await ensureEbook(req.params.ebookId)

    const { asset_type, original_filename, mime_type, size } = req.body || {}
    if (!asset_type || !original_filename || !mime_type) {
      return res.status(422).json({
        message: 'asset_type, original_filename et mime_type sont requis',
      })
    }

    const result = await createPresignedUpload({
      ebookId: Number(req.params.ebookId),
      assetType: asset_type,
      originalname: original_filename,
      mimetype: mime_type,
      size: Number(size) || 0,
      uploadedBy: req.user.id,
    })

    res.status(201).json({
      data: {
        asset: result.asset,
        uploadUrl: result.upload.url,
        expiresIn: result.upload.expiresIn,
        objectKey: result.upload.key,
      },
    })
  } catch (err) {
    if (err instanceof FileValidationError) {
      return res.status(err.status).json({ message: err.message })
    }
    next(err)
  }
})

router.post('/ebooks/:ebookId/assets/confirm-upload', async (req, res, next) => {
  try {
    if (!requireR2(res)) return
    await ensureEbook(req.params.ebookId)
    const assetId = req.body?.asset_id
    if (!assetId) {
      return res.status(422).json({ message: 'asset_id requis' })
    }
    const asset = await confirmPresignedUpload(Number(req.params.ebookId), Number(assetId))
    res.json({ data: asset })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
})

router.delete('/ebooks/:ebookId/assets/:assetId', async (req, res, next) => {
  try {
    if (!requireR2(res)) return
    await ensureEbook(req.params.ebookId)
    const existing = await getAsset(req.params.ebookId, req.params.assetId)
    if (!existing) return res.status(404).json({ message: 'Asset introuvable' })
    await softDeleteAsset(Number(req.params.ebookId), Number(req.params.assetId))
    res.json({ message: 'Asset supprimé' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
})

export async function deleteEbookR2Objects(ebookId) {
  if (!isR2Configured()) return
  try {
    const objects = await listObjectsByPrefix(ebookPrefix(ebookId))
    if (objects.length) {
      await deleteObjects(objects.map((o) => o.key))
    }
  } catch (err) {
    console.warn('[R2] suppression préfixe ebook échouée', { ebookId })
  }
}

export default router
