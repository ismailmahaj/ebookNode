import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query } from '../db/pool.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non authentifié' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub])
    if (!rows.length) {
      return res.status(401).json({ message: 'Utilisateur introuvable' })
    }
    req.user = rows[0]
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    query('SELECT * FROM users WHERE id = $1', [payload.sub])
      .then(({ rows }) => {
        if (rows.length) req.user = rows[0]
        next()
      })
      .catch(() => next())
  } catch {
    next()
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' })
  }
  next()
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}
