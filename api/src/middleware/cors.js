import { config } from '../config.js'

function isAllowedOrigin(origin) {
  if (!origin) return true

  if (config.corsOrigins.includes(origin)) return true

  // Railway : autoriser les sous-domaines .up.railway.app en production
  if (config.nodeEnv === 'production' && /\.up\.railway\.app$/.test(origin)) {
    return true
  }

  return false
}

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true)
    } else {
      console.warn(`CORS refusé pour: ${origin}`)
      callback(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
}

export function corsMiddleware() {
  return (req, res, next) => {
    const origin = req.headers.origin
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Vary', 'Origin')
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '))
      res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '))
      return res.sendStatus(204)
    }
    next()
  }
}
