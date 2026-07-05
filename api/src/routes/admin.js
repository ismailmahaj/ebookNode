import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { query } from '../db/pool.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { uploadEbookFiles, uploadsPath } from '../middleware/upload.js'
import { paginate, paginatedResponse, parseBool } from '../utils/pagination.js'
import {
  formatCategory,
  formatEbook,
  loadCategoriesForEbooks,
  parseCategoryIds,
  validationError,
} from '../utils/ebook.js'
import { formatUser } from '../utils/user.js'
import { uniqueSlug } from '../utils/slug.js'

const router = Router()

router.use(authenticate, requireAdmin)

const SORT_COLUMNS = {
  published_at: 'e.published_at',
  created_at: 'e.created_at',
  title: 'e.title',
  author: 'e.author',
}

function buildAdminEbookFilters(params) {
  const conditions = []
  const values = []
  let idx = 1

  if (params.search) {
    conditions.push(`(e.title ILIKE $${idx} OR e.author ILIKE $${idx})`)
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

  if (params.is_active !== undefined) {
    const active = parseBool(params.is_active)
    if (active !== undefined) {
      conditions.push(`e.is_active = $${idx++}`)
      values.push(active)
    }
  }

  if (params.is_featured !== undefined) {
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

async function getEbookWithCategories(id) {
  const { rows } = await query('SELECT * FROM ebooks WHERE id = $1', [id])
  if (!rows.length) return null
  const catMap = await loadCategoriesForEbooks(query, [id])
  return formatEbook(rows[0], catMap.get(id) || [])
}

async function countPdfPages(filePath) {
  try {
    const buffer = fs.readFileSync(filePath)
    const data = await pdf(buffer)
    return data.numpages || 0
  } catch {
    return 0
  }
}

function publicPath(folder, filename) {
  return `/uploads/${folder}/${filename}`
}

function resolveStoredPath(storedPath) {
  const relative = storedPath.replace(/^\/uploads\//, '')
  return path.join(uploadsPath, relative)
}

function removeFile(storedPath) {
  if (!storedPath) return
  const full = resolveStoredPath(storedPath)
  if (fs.existsSync(full)) fs.unlinkSync(full)
}

async function syncCategories(ebookId, categoryIds) {
  await query('DELETE FROM ebook_category WHERE ebook_id = $1', [ebookId])
  for (const catId of categoryIds) {
    await query(
      'INSERT INTO ebook_category (ebook_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [ebookId, catId]
    )
  }
}

// --- Catégories ---

router.get('/categories', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM categories ORDER BY name')
    res.json(rows.map(formatCategory))
  } catch (err) {
    next(err)
  }
})

// --- Ebooks admin ---

router.get('/ebooks', async (req, res, next) => {
  try {
    const { page, perPage, offset, limit } = paginate(req.query.page, req.query.per_page)
    const { conditions, values, sortCol, sortOrder, idx } = buildAdminEbookFilters(req.query)
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRes = await query(`SELECT COUNT(*)::int AS total FROM ebooks e ${where}`, values)
    const total = countRes.rows[0].total

    const { rows } = await query(
      `SELECT e.* FROM ebooks e ${where}
       ORDER BY ${sortCol} ${sortOrder} NULLS LAST, e.id DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    )

    const catMap = await loadCategoriesForEbooks(query, rows.map((r) => r.id))
    const data = rows.map((r) => formatEbook(r, catMap.get(r.id) || []))
    res.json(paginatedResponse(data, total, page, perPage))
  } catch (err) {
    next(err)
  }
})

router.get('/ebooks/:id', async (req, res, next) => {
  try {
    const ebook = await getEbookWithCategories(req.params.id)
    if (!ebook) return res.status(404).json({ message: 'Ebook introuvable' })
    res.json({ ebook })
  } catch (err) {
    next(err)
  }
})

router.post('/ebooks', (req, res, next) => {
  uploadEbookFiles(req, res, async (err) => {
    if (err) {
      return res.status(422).json({ message: err.message })
    }

    try {
      const body = req.body
      const errors = {}

      if (!body.title?.trim()) errors.title = ['Le titre est requis']
      if (!body.author?.trim()) errors.author = ['L\'auteur est requis']
      if (!body.description?.trim()) errors.description = ['La description est requise']

      const categoryIds = parseCategoryIds(body.category_ids)
      if (!categoryIds.length) errors.category_ids = ['Sélectionnez au moins une catégorie']

      const pdfFile = req.files?.pdf_file?.[0]
      const coverFile = req.files?.cover_image?.[0]
      if (!pdfFile) errors.pdf_file = ['Le fichier PDF est requis']
      if (!coverFile) errors.cover_image = ['L\'image de couverture est requise']

      if (Object.keys(errors).length) {
        if (pdfFile) removeFile(publicPath('pdfs', pdfFile.filename))
        if (coverFile) removeFile(publicPath('covers', coverFile.filename))
        return validationError(res, errors)
      }

      const slug = await uniqueSlug(query, body.title.trim())
      const totalPages = await countPdfPages(pdfFile.path)

      const { rows } = await query(
        `INSERT INTO ebooks (
          title, slug, author, description, isbn,
          cover_image_path, pdf_file_path, pdf_file_size, total_pages,
          preview_pages, published_at, is_featured, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
        [
          body.title.trim(),
          slug,
          body.author.trim(),
          body.description.trim(),
          body.isbn?.trim() || null,
          publicPath('covers', coverFile.filename),
          publicPath('pdfs', pdfFile.filename),
          pdfFile.size,
          totalPages,
          parseInt(body.preview_pages, 10) || 10,
          body.published_at || null,
          parseBool(body.is_featured) ?? false,
          parseBool(body.is_active) ?? true,
        ]
      )

      await syncCategories(rows[0].id, categoryIds)
      const ebook = await getEbookWithCategories(rows[0].id)
      res.status(201).json({ ebook })
    } catch (e) {
      next(e)
    }
  })
})

router.post('/ebooks/:id', (req, res, next) => {
  uploadEbookFiles(req, res, async (err) => {
    if (err) {
      return res.status(422).json({ message: err.message })
    }

    try {
      const ebookId = req.params.id
      const existing = await query('SELECT * FROM ebooks WHERE id = $1', [ebookId])
      if (!existing.rows.length) {
        return res.status(404).json({ message: 'Ebook introuvable' })
      }

      const current = existing.rows[0]
      const body = req.body
      const errors = {}

      if (!body.title?.trim()) errors.title = ['Le titre est requis']
      if (!body.author?.trim()) errors.author = ['L\'auteur est requis']
      if (!body.description?.trim()) errors.description = ['La description est requise']

      const categoryIds = parseCategoryIds(body.category_ids)
      if (!categoryIds.length) errors.category_ids = ['Sélectionnez au moins une catégorie']

      if (Object.keys(errors).length) {
        return validationError(res, errors)
      }

      const pdfFile = req.files?.pdf_file?.[0]
      const coverFile = req.files?.cover_image?.[0]

      let coverPath = current.cover_image_path
      let pdfPath = current.pdf_file_path
      let pdfSize = current.pdf_file_size
      let totalPages = current.total_pages

      if (coverFile) {
        removeFile(current.cover_image_path)
        coverPath = publicPath('covers', coverFile.filename)
      }

      if (pdfFile) {
        removeFile(current.pdf_file_path)
        pdfPath = publicPath('pdfs', pdfFile.filename)
        pdfSize = pdfFile.size
        totalPages = await countPdfPages(pdfFile.path)
      }

      const slug = body.title.trim() !== current.title
        ? await uniqueSlug(query, body.title.trim(), ebookId)
        : current.slug

      const { rows } = await query(
        `UPDATE ebooks SET
          title = $1, slug = $2, author = $3, description = $4, isbn = $5,
          cover_image_path = $6, pdf_file_path = $7, pdf_file_size = $8, total_pages = $9,
          preview_pages = $10, published_at = $11, is_featured = $12, is_active = $13,
          updated_at = NOW()
        WHERE id = $14
        RETURNING *`,
        [
          body.title.trim(),
          slug,
          body.author.trim(),
          body.description.trim(),
          body.isbn?.trim() || null,
          coverPath,
          pdfPath,
          pdfSize,
          totalPages,
          parseInt(body.preview_pages, 10) || 10,
          body.published_at || null,
          parseBool(body.is_featured) ?? current.is_featured,
          parseBool(body.is_active) ?? current.is_active,
          ebookId,
        ]
      )

      await syncCategories(ebookId, categoryIds)
      const ebook = await getEbookWithCategories(rows[0].id)
      res.json({ ebook })
    } catch (e) {
      next(e)
    }
  })
})

router.delete('/ebooks/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM ebooks WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'Ebook introuvable' })

    const ebook = rows[0]
    removeFile(ebook.cover_image_path)
    removeFile(ebook.pdf_file_path)
    await query('DELETE FROM ebooks WHERE id = $1', [req.params.id])
    res.json({ message: 'Ebook supprimé' })
  } catch (err) {
    next(err)
  }
})

router.post('/ebooks/:id/toggle-visibility', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE ebooks SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Ebook introuvable' })

    const ebook = await getEbookWithCategories(rows[0].id)
    res.json({
      message: ebook.is_active ? 'Ebook rendu visible' : 'Ebook masqué',
      ebook,
    })
  } catch (err) {
    next(err)
  }
})

// --- Utilisateurs admin ---

router.get('/users', async (req, res, next) => {
  try {
    const { page, perPage, offset, limit } = paginate(req.query.page, req.query.per_page)
    const conditions = []
    const values = []
    let idx = 1

    if (req.query.search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`)
      values.push(`%${req.query.search}%`)
      idx++
    }

    if (req.query.subscription_status === 'active') {
      conditions.push(`(
        subscription_status = 'active'
        AND (subscription_ends_at IS NULL OR subscription_ends_at > NOW())
      ) OR (trial_ends_at IS NOT NULL AND trial_ends_at > NOW())`)
    } else if (req.query.subscription_status === 'inactive') {
      conditions.push(`NOT (
        (subscription_status = 'active' AND (subscription_ends_at IS NULL OR subscription_ends_at > NOW()))
        OR (trial_ends_at IS NOT NULL AND trial_ends_at > NOW())
      )`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM users ${where}`, values)
    const total = countRes.rows[0].total

    const { rows } = await query(
      `SELECT * FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    )

    res.json(paginatedResponse(rows.map(formatUser), total, page, perPage))
  } catch (err) {
    next(err)
  }
})

router.patch('/users/:id/subscription', async (req, res, next) => {
  try {
    const { subscription_status, subscription_ends_at } = req.body || {}
    const userId = req.params.id

    const { rows: existing } = await query('SELECT * FROM users WHERE id = $1', [userId])
    if (!existing.length) return res.status(404).json({ message: 'Utilisateur introuvable' })

    if (existing[0].is_admin) {
      return res.status(422).json({ message: 'Impossible de modifier l\'abonnement d\'un administrateur' })
    }

    let status = subscription_status
    let endsAt = subscription_ends_at || null

    if (status === 'active') {
      if (!endsAt) {
        const d = new Date()
        d.setMonth(d.getMonth() + 1)
        endsAt = d.toISOString().slice(0, 10)
      }
    } else if (status === 'inactive' || status === 'canceled') {
      status = null
      endsAt = null
    }

    const { rows } = await query(
      `UPDATE users SET
        subscription_status = $1,
        subscription_ends_at = $2,
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, endsAt, userId]
    )

    res.json({
      message: status === 'active' ? 'Abonnement activé' : 'Abonnement retiré',
      user: formatUser(rows[0]),
    })
  } catch (err) {
    next(err)
  }
})

export default router
