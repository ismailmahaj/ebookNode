import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { initDatabase } from './db/init.js'
import { corsOptions, corsMiddleware } from './middleware/cors.js'
import authRoutes from './routes/auth.js'
import ebookRoutes from './routes/ebooks.js'
import categoryRoutes from './routes/categories.js'
import adminRoutes from './routes/admin.js'
import setupRoutes from './routes/setup.js'
import webhookRoutes from './routes/webhooks.js'
import subscriptionRoutes from './routes/subscription.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(corsMiddleware())
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use('/api/webhooks', webhookRoutes)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

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
    })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

app.use('/api/setup', setupRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/ebooks', ebookRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/subscription', subscriptionRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({
    message: config.nodeEnv === 'development' ? err.message : 'Erreur serveur interne',
  })
})

async function start() {
  try {
    await pool.query('SELECT 1')
    console.log('PostgreSQL connecté')
    await initDatabase(pool)
  } catch (err) {
    console.error('Impossible de démarrer:', err.message)
    process.exit(1)
  }

  app.listen(config.port, () => {
    console.log(`API démarrée sur ${config.appUrl} (port ${config.port})`)
    console.log(`CORS autorisés: ${config.corsOrigins.join(', ') || '(aucun — fallback railway.app en prod)'}`)
  })
}

start()
