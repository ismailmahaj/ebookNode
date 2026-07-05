import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db/pool.js'
import { config } from '../config.js'
import { formatAuthUser } from '../utils/user.js'

const router = Router()

/**
 * Secours : promouvoir un email en admin.
 * POST /api/setup/promote-admin
 * Body: { "email": "admin@example.com", "secret": "...", "password": "..." (optionnel) }
 * Variable Railway : ADMIN_SETUP_SECRET
 */
router.post('/promote-admin', async (req, res) => {
  const { email, secret, password } = req.body || {}

  if (!config.setupSecret) {
    return res.status(503).json({
      message: 'ADMIN_SETUP_SECRET non configuré sur le serveur',
    })
  }

  if (secret !== config.setupSecret) {
    return res.status(403).json({ message: 'Secret invalide' })
  }

  if (!email?.trim()) {
    return res.status(422).json({ message: 'Email requis' })
  }

  const normalized = email.trim().toLowerCase()
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [normalized])

  if (rows.length === 0) {
    if (!password || password.length < 8) {
      return res.status(422).json({
        message: 'Utilisateur introuvable. Fournissez un mot de passe (8+ caractères) pour le créer.',
      })
    }
    const hash = await bcrypt.hash(password, 12)
    const { rows: created } = await query(
      `INSERT INTO users (name, email, password_hash, is_admin, subscription_status)
       VALUES ($1, $2, $3, TRUE, 'active') RETURNING *`,
      [config.admin.name, normalized, hash]
    )
    return res.json({
      message: `Admin créé: ${normalized}`,
      user: formatAuthUser(created[0]),
    })
  }

  const updates = ['is_admin = TRUE', "subscription_status = 'active'", 'updated_at = NOW()']
  const params = []
  let idx = 1

  if (password && password.length >= 8) {
    const hash = await bcrypt.hash(password, 12)
    updates.push(`password_hash = $${idx++}`)
    params.push(hash)
  }

  params.push(normalized)
  const { rows: updated } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE email = $${idx} RETURNING *`,
    params
  )

  res.json({
    message: `Admin activé: ${normalized}`,
    user: formatAuthUser(updated[0]),
  })
})

export default router
