import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { paginate, paginatedResponse, parseBool } from '../utils/pagination.js'
import { formatEbook, loadCategoriesForEbooks } from '../utils/ebook.js'
import { hasActiveSubscription } from '../utils/user.js'
import { uploadsPath } from '../middleware/upload.js'
import { isR2Configured } from '../config/r2.js'
import { getObjectStream } from '../services/storage/r2StorageService.js'

const router = Router()

const SORT_COLUMNS = {
  published_at: 'e.published_at',
  created_at: 'e.created_at',
  title: 'e.title',
  author: 'e.author',
}

function buildEbookFilters(params, admin = false) {
  const conditions = []
  const values = []
  let idx = 1

  if (!admin) {
    conditions.push('e.is_active = TRUE')
  } else if (params.is_active !== undefined) {
    const active = parseBool(params.is_active)
    if (active !== undefined) {
      conditions.push(`e.is_active = $${idx++}`)
      values.push(active)
    }
  }

  if (params.search) {
    conditions.push(`(e.title ILIKE $${idx} OR e.author ILIKE $${idx} OR e.description ILIKE $${idx})`)
    values.push(`%${params.search}%`)
    idx++
  }

  if (params.category_id) {
    conditions.push(`EXISTS (
      SELECT 1 FROM ebook_category ec
      WHERE ec.ebook_id = e.id AND ec.category_id = $${idx}
    )`)
    values.push(Number(params.category_id))
    idx++
  }

  if (parseBool(params.featured) === true) {
    conditions.push('e.is_featured = TRUE')
  }

  if (admin && params.is_featured !== undefined) {
    const featured = parseBool(params.is_featured)
    if (featured !== undefined) {
      conditions.push(`e.is_featured = $${idx++}`)
      values.push(featured)
    }
  }

  const sortCol = SORT_COLUMNS[params.sort_by] || 'e.created_at'
  const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC'

  return { conditions, values, sortCol, sortOrder, idx }
}

async function listEbooks(req, res, admin = false) {
  const { page, perPage, offset, limit } = paginate(req.query.page, req.query.per_page)
  const { conditions, values, sortCol, sortOrder, idx } = buildEbookFilters(req.query, admin)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*)::int AS total FROM ebooks e ${where}`
  const countRes = await query(countSql, values)
  const total = countRes.rows[0].total

  const dataSql = `
    SELECT e.*
    FROM ebooks e
    ${where}
    ORDER BY ${sortCol} ${sortOrder} NULLS LAST, e.id DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `
  const { rows } = await query(dataSql, [...values, limit, offset])
  const catMap = await loadCategoriesForEbooks(query, rows.map((r) => r.id))
  const data = rows.map((r) => formatEbook(r, catMap.get(r.id) || []))

  res.json(paginatedResponse(data, total, page, perPage))
}

router.get('/', authenticate, (req, res, next) => {
  listEbooks(req, res, false).catch(next)
})

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM ebooks WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Ebook introuvable' })

    const catMap = await loadCategoriesForEbooks(query, [rows[0].id])
    res.json(formatEbook(rows[0], catMap.get(rows[0].id) || []))
  } catch (err) {
    next(err)
  }
})

function resolveStoredPath(storedPath) {
  if (!storedPath) return null
  const relative = storedPath.replace(/^\/uploads\//, '')
  return path.join(uploadsPath, relative)
}

async function sendPdf(res, ebook, { preferPreview = false } = {}) {
  // R2 prioritaire
  const objectKey = preferPreview
    ? ebook.preview_pdf_object_key || ebook.pdf_object_key
    : ebook.pdf_object_key

  if (objectKey && isR2Configured()) {
    try {
      const { body, contentType, contentLength } = await getObjectStream(objectKey)
      res.setHeader('Content-Type', contentType || 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${ebook.slug || 'book'}.pdf"`)
      if (contentLength) res.setHeader('Content-Length', contentLength)
      if (typeof body.pipe === 'function') {
        body.pipe(res)
      } else {
        // SDK v3 may return async iterable
        const chunks = []
        for await (const chunk of body) chunks.push(chunk)
        res.send(Buffer.concat(chunks))
      }
      return
    } catch (err) {
      console.error('[R2] erreur stream PDF', { ebookId: ebook.id })
      return res.status(503).json({ message: 'Fichier temporairement indisponible' })
    }
  }

  // Fallback local
  if (!ebook.pdf_file_path) {
    return res.status(404).json({ message: 'Fichier PDF non disponible' })
  }

  const resolved = path.resolve(resolveStoredPath(ebook.pdf_file_path))
  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ message: 'Fichier PDF non disponible' })
  }

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${ebook.slug}.pdf"`)
  fs.createReadStream(resolved).pipe(res)
}

router.get('/:id/preview', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM ebooks WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Ebook introuvable' })
    // Prefer preview object if present; else legacy full PDF (compat)
    await sendPdf(res, rows[0], { preferPreview: true })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/stream', authenticate, async (req, res, next) => {
  try {
    if (!hasActiveSubscription(req.user)) {
      return res.status(403).json({ message: 'Un abonnement actif est requis pour lire ce livre.' })
    }

    const { rows } = await query(
      'SELECT * FROM ebooks WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Ebook introuvable' })

    await query('UPDATE ebooks SET total_views = total_views + 1 WHERE id = $1', [req.params.id])
    await sendPdf(res, rows[0], { preferPreview: false })
  } catch (err) {
    next(err)
  }
})

export default router
