import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { pool } from './db/pool.js'
import authRoutes from './routes/auth.js'
import ebookRoutes from './routes/ebooks.js'
import adminRoutes from './routes/admin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ebook-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/ebooks', ebookRoutes)
app.use('/api/admin', adminRoutes)

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
  } catch (err) {
    console.error('Impossible de se connecter à PostgreSQL:', err.message)
    console.error('Vérifiez DATABASE_URL et exécutez: npm run db:migrate && npm run db:seed')
    process.exit(1)
  }

  app.listen(config.port, () => {
    console.log(`API démarrée sur ${config.appUrl} (port ${config.port})`)
  })
}

start()
