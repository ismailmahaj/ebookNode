import { Router } from 'express'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { hasActiveSubscription } from '../utils/user.js'
import { isR2Configured } from '../config/r2.js'
import {
  createAccessUrl,
  getAsset,
} from '../services/ebookAssetService.js'
import { getSignedDownloadUrl } from '../services/storage/r2StorageService.js'
import { config } from '../config.js'

const router = Router()

async function loadEbook(id) {
  const { rows } = await query(
    'SELECT * FROM ebooks WHERE id = $1 AND is_active = TRUE',
    [id]
  )
  return rows[0] || null
}

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
    const ebook = await loadEbook(req.params.id)
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

    // Fallback local
    if (ebook.cover_image_path) {
      const url = ebook.cover_image_path.startsWith('http')
        ? ebook.cover_image_path
        : `${config.appUrl}${ebook.cover_image_path}`
      return res.json({
        data: { url, expiresIn: null, ebookId: ebook.id, type: 'cover' },
      })
    }

    return res.status(404).json({ message: 'Couverture introuvable' })
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
