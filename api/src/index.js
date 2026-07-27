import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config, validateR2ConfigOrThrow } from './config.js'
import { isR2Configured, verifyR2Connection } from './config/r2.js'
import { pool } from './db/pool.js'
import { initDatabase } from './db/init.js'
import { corsOptions, corsMiddleware } from './middleware/cors.js'
import authRoutes from './routes/auth.js'
import ebookRoutes from './routes/ebooks.js'
import ebookAccessRoutes from './routes/ebookAccess.js'
import categoryRoutes from './routes/categories.js'
import adminRoutes from './routes/admin.js'
import adminAssetsRoutes from './routes/adminAssets.js'
import setupRoutes from './routes/setup.js'
import webhookRoutes from './routes/webhooks.js'
import subscriptionRoutes from './routes/subscription.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(corsMiddleware())
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use('/api/webhooks', webhookRoutes)

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// Couvertures locales uniquement — ne plus exposer /uploads/pdfs en public
app.use(
  '/uploads/covers',
  express.static(path.join(__dirname, '../uploads/covers'))
)

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT email FROM users WHERE is_admin = TRUE ORDER BY id'
    )
    res.json({
      status: 'ok',
      service: 'ebook-api',
      adminEmailConfigured: config.admin.email,
      adminsInDatabase: rows.map((r) => r.email),
      hasAdmin: rows.length > 0,
      storage: isR2Configured() ? 'cloudflare-r2' : 'local',
    })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

app.use('/api/setup', setupRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/ebooks', ebookAccessRoutes)
app.use('/api/ebooks', ebookRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/admin', adminAssetsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/subscription', subscriptionRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    message:
      status < 500 || config.nodeEnv === 'development'
        ? err.message
        : 'Erreur serveur interne',
  })
})

async function start() {
  try {
    const storageMode = validateR2ConfigOrThrow()
    console.log(`Mode stockage: ${storageMode}`)

    if (storageMode === 'r2') {
      await verifyR2Connection()
      console.log(`R2 connecté (bucket: ${config.r2.bucketName})`)
    } else {
      console.warn(
        'R2 non configuré — stockage local (dev). Configurez les variables R2 pour la production.'
      )
    }

    await pool.query('SELECT 1')
    console.log('PostgreSQL connecté')
    await initDatabase(pool)
  } catch (err) {
    console.error('Impossible de démarrer:', err.message)
    process.exit(1)
  }

  app.listen(config.port, () => {
    console.log(`API démarrée sur ${config.appUrl} (port ${config.port})`)
    console.log(
      `CORS autorisés: ${config.corsOrigins.join(', ') || '(aucun — fallback railway.app en prod)'}`
    )
  })
}

start()
