import { Router } from 'express'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'
import { formatCategory } from '../utils/ebook.js'

const router = Router()

// Catégories ayant au moins un ebook actif, avec le nombre d'ebooks.
router.get('/', authenticate, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, COUNT(e.id)::int AS ebooks_count
       FROM categories c
       JOIN ebook_category ec ON ec.category_id = c.id
       JOIN ebooks e ON e.id = ec.ebook_id AND e.is_active = TRUE
       GROUP BY c.id
       HAVING COUNT(e.id) > 0
       ORDER BY c.name`
    )
    res.json(rows.map((row) => ({ ...formatCategory(row), ebooks_count: row.ebooks_count })))
  } catch (err) {
    next(err)
  }
})

export default router
