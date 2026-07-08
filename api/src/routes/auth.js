import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db/pool.js'
import { authenticate, signToken } from '../middleware/auth.js'
import { formatAuthUser } from '../utils/user.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { name, email, password, password_confirmation } = req.body || {}
  const errors = {}

  if (!name?.trim()) errors.name = ['Le nom est requis']
  if (!email?.trim()) errors.email = ['L\'email est requis']
  if (!password) errors.password = ['Le mot de passe est requis']
  else if (password.length < 8) errors.password = ['Le mot de passe doit contenir au moins 8 caractères']
  if (password !== password_confirmation) {
    errors.password_confirmation = ['Les mots de passe ne correspondent pas']
  }

  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'Erreur de validation', errors })
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()])
  if (existing.rows.length) {
    return res.status(422).json({
      message: 'Erreur de validation',
      errors: { email: ['Cet email est déjà utilisé'] },
    })
  }

  const hash = await bcrypt.hash(password, 12)

  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, subscription_status)
     VALUES ($1, $2, $3, 'inactive')
     RETURNING *`,
    [name.trim(), email.trim().toLowerCase(), hash]
  )

  const user = rows[0]
  const token = signToken(user.id)
  res.status(201).json({ user: formatAuthUser(user), token })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(422).json({
      message: 'Erreur de validation',
      errors: { email: ['Email et mot de passe requis'] },
    })
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()])
  const user = rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Identifiants incorrects' })
  }

  const token = signToken(user.id)
  res.json({ user: formatAuthUser(user), token })
})

router.get('/me', authenticate, (req, res) => {
  res.json(formatAuthUser(req.user))
})

router.post('/logout', authenticate, (_req, res) => {
  res.json({ message: 'Déconnexion réussie' })
})

export default router
