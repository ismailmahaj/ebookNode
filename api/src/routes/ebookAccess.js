import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { hasActiveSubscription } from '../utils/user.js'
import { isR2Configured } from '../config/r2.js'
import {
  createAccessUrl,
  getAsset,
} from '../services/ebookAssetService.js'
import { getSignedDownloadUrl, getObjectStream } from '../services/storage/r2StorageService.js'
import { config } from '../config.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsRoot = path.join(__dirname, '../../uploads')

async function loadEbook(id, { activeOnly = true } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM ebooks WHERE id = $1 AND is_active = TRUE'
    : 'SELECT * FROM ebooks WHERE id = $1'
  const { rows } = await query(sql, [id])
  return rows[0] || null
}

/**
 * GET /api/ebooks/:id/cover
 * Public — couverture seule (pas le PDF). Stable pour <img src>.
 */
router.get('/:id/cover', async (req, res, next) => {
  try {
    const ebook = await loadEbook(req.params.id, { activeOnly: false })
    if (!ebook) return res.status(404).json({ message: 'Ebook introuvable' })

    res.setHeader('Cache-Control', 'public, max-age=3600')

    if (ebook.cover_object_key && isR2Configured()) {
      try {
        const { body, contentType, contentLength } = await getObjectStream(
          ebook.cover_object_key
        )
        res.setHeader('Content-Type', contentType || 'image/jpeg')
        if (contentLength != null) res.setHeader('Content-Length', String(contentLength))

        if (body && typeof body.pipe === 'function') {
          return body.pipe(res)
        }
        if (body?.transformToByteArray) {
          const bytes = await body.transformToByteArray()
          return res.send(Buffer.from(bytes))
        }
      } catch (err) {
        const missing =
          err?.name === 'NoSuchKey' ||
          err?.$metadata?.httpStatusCode === 404 ||
          /does not exist|NotFound|NoSuchKey/i.test(err?.message || '')
        if (!missing) {
          console.error('[cover] R2 error', { id: ebook.id, message: err?.message })
          return res.status(503).json({ message: 'Couverture temporairement indisponible' })
        }
        console.warn('[cover] clé R2 absente', { id: ebook.id, key: ebook.cover_object_key })
        // tombe sur fallback local si présent
      }
    }

    if (ebook.cover_image_path) {
      const candidates = [
        path.join(__dirname, '../..', ebook.cover_image_path.replace(/^\//, '')),
        path.join(uploadsRoot, 'covers', path.basename(ebook.cover_image_path)),
      ]

      const existing = candidates.find((p) => fs.existsSync(p))
      if (existing) {
        return res.sendFile(existing)
      }
    }

    return res.status(404).json({ message: 'Couverture introuvable' })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ebooks/:id/read-url?format=pdf|epub
 * Abonnement requis — URL signée temporaire.
 */
router.get('/:id/read-url', authenticate, async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({ message: 'Stockage R2 non configuré' })
    }
    if (!hasActiveSubscription(req.user)) {
      return res.status(403).json({
        message: 'Un abonnement actif est requis pour lire ce livre.',
      })
    }

    const ebook = await loadEbook(req.params.id)
    if (!ebook) return res.status(404).json({ message: 'Ebook introuvable' })

    const format = (req.query.format || 'pdf').toLowerCase()
    if (!['pdf', 'epub'].includes(format)) {
      return res.status(422).json({ message: 'format doit être pdf ou epub' })
    }

    const result = await createAccessUrl(ebook, format, { preview: false })
    await query('UPDATE ebooks SET total_views = total_views + 1 WHERE id = $1', [
      ebook.id,
    ])

    res.json({
      data: {
        url: result.url,
        expiresIn: result.expiresIn,
        contentType: result.contentType,
        format: result.format,
        ebookId: result.ebookId,
      },
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
})

/**
 * GET /api/ebooks/:id/preview-url
 * Auth seule — extrait uniquement (jamais le fichier complet via cet endpoint).
 */
router.get('/:id/preview-url', authenticate, async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({ message: 'Stockage R2 non configuré' })
    }

    const ebook = await loadEbook(req.params.id)
    if (!ebook) return res.status(404).json({ message: 'Ebook introuvable' })

    const format = (req.query.format || 'pdf').toLowerCase()
    if (!ebook.preview_pdf_object_key && !ebook.preview_epub_object_key) {
      return res.status(404).json({
        message:
          'Aucun extrait dédié n\'est disponible. Demandez à l\'admin d\'uploader un preview.',
      })
    }

    const result = await createAccessUrl(ebook, format, { preview: true })
    res.json({
      data: {
        url: result.url,
        expiresIn: result.expiresIn,
        contentType: result.contentType,
        format: result.format,
        ebookId: result.ebookId,
        preview: true,
      },
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    next(err)
  }
})

/**
 * GET /api/ebooks/:id/cover-url
 * Auth — couverture via URL signée (bucket privé).
 */
router.get('/:id/cover-url', authenticate, async (req, res, next) => {
  try {
    const ebook = await loadEbook(req.params.id, { activeOnly: false })
    if (!ebook) return res.status(404).json({ message: 'Ebook introuvable' })

    if (ebook.cover_object_key && isR2Configured()) {
      const { url, expiresIn } = await getSignedDownloadUrl(
        ebook.cover_object_key,
        Math.min(config.r2.signedUrlExpirationSeconds * 12, 3600)
      )
      return res.json({
        data: { url, expiresIn, ebookId: ebook.id, type: 'cover' },
      })
    }

    return res.json({
      data: {
        url: `/api/ebooks/${ebook.id}/cover`,
        expiresIn: null,
        ebookId: ebook.id,
        type: 'cover',
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/ebooks/:id/assets/:assetId/url
 */
router.get('/:id/assets/:assetId/url', authenticate, async (req, res, next) => {
  try {
    if (!isR2Configured()) {
      return res.status(503).json({ message: 'Stockage R2 non configuré' })
    }

    const ebook = await loadEbook(req.params.id)
    if (!ebook) return res.status(404).json({ message: 'Ebook introuvable' })

    const asset = await getAsset(req.params.id, req.params.assetId)
    if (!asset || asset.status !== 'READY') {
      return res.status(404).json({ message: 'Asset introuvable' })
    }

    const isPreview = asset.is_preview || asset.type.includes('PREVIEW')
    const isCover = asset.type === 'COVER'

    if (!isPreview && !isCover && !hasActiveSubscription(req.user)) {
      return res.status(403).json({
        message: 'Un abonnement actif est requis pour accéder à ce fichier.',
      })
    }

    const { url, expiresIn } = await getSignedDownloadUrl(asset.object_key)
    res.json({
      data: {
        url,
        expiresIn,
        assetId: asset.id,
        ebookId: ebook.id,
        type: asset.type,
        contentType: asset.mime_type,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
