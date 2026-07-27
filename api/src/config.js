import dotenv from 'dotenv'

dotenv.config()

function parseIntEnv(name, fallback) {
  const v = parseInt(process.env[name] || String(fallback), 10)
  return Number.isFinite(v) ? v : fallback
}

function buildR2Endpoint() {
  if (process.env.R2_ENDPOINT) {
    return process.env.R2_ENDPOINT.replace(/\/$/, '')
  }
  const accountId = process.env.R2_ACCOUNT_ID || ''
  if (!accountId) return ''
  return `https://${accountId}.r2.cloudflarestorage.com`
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ebook_db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl: (process.env.APP_URL || 'http://localhost:8000').replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@ebook.local',
    password: process.env.ADMIN_PASSWORD || 'admin123456',
    name: process.env.ADMIN_NAME || 'Administrateur',
    syncPassword: process.env.ADMIN_SYNC_PASSWORD === 'true',
  },
  setupSecret: process.env.ADMIN_SETUP_SECRET || '',
  frontendUrl: (
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGINS?.split(',')[0]?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, ''),
  subscription: {
    priceEur: parseFloat(process.env.SUBSCRIPTION_PRICE_EUR || '3.99'),
  },
  airwallex: {
    apiBase: (process.env.AIRWALLEX_API_BASE || 'https://api-demo.airwallex.com').replace(/\/$/, ''),
    clientId: process.env.AIRWALLEX_CLIENT_ID || '',
    apiKey: process.env.AIRWALLEX_API_KEY || '',
    webhookSecret: process.env.AIRWALLEX_WEBHOOK_SECRET || '',
    priceId: process.env.AIRWALLEX_PRICE_ID || '',
    legalEntityId: process.env.AIRWALLEX_LEGAL_ENTITY_ID || '',
    linkedPaymentAccountId: process.env.AIRWALLEX_LINKED_PAYMENT_ACCOUNT_ID || '',
    loginAs: process.env.AIRWALLEX_LOGIN_AS || '',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'ebooks-storage',
    endpoint: buildR2Endpoint(),
    signedUrlExpirationSeconds: parseIntEnv('R2_SIGNED_URL_EXPIRATION_SECONDS', 300),
    maxPdfSizeMb: parseIntEnv('R2_MAX_PDF_SIZE_MB', 100),
    maxEpubSizeMb: parseIntEnv('R2_MAX_EPUB_SIZE_MB', 100),
    maxCoverSizeMb: parseIntEnv('R2_MAX_COVER_SIZE_MB', 10),
    maxAudioSizeMb: parseIntEnv('R2_MAX_AUDIO_SIZE_MB', 500),
    // En production Railway, forcer R2. En local, laisser R2_REQUIRED=false pour fallback.
    required: process.env.R2_REQUIRED === 'true',
  },
}

/**
 * Valide la configuration R2 au démarrage.
 * @returns {'r2'|'local'}
 */
export function validateR2ConfigOrThrow() {
  const values = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || '',
    R2_ENDPOINT: process.env.R2_ENDPOINT || (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : ''),
  }
  const keys = Object.keys(values)

  const present = keys.filter((k) => Boolean(values[k]))
  const missing = keys.filter((k) => !values[k])

  if (config.r2.required) {
    if (missing.length) {
      throw new Error(
        `Configuration Cloudflare R2 incomplète (obligatoire). Variables manquantes: ${missing.join(', ')}`
      )
    }
    return 'r2'
  }

  // Aucune credential fournie → mode local (ignore le défaut bucketName dans config)
  const hasCredentials = Boolean(
    process.env.R2_ACCESS_KEY_ID || process.env.R2_SECRET_ACCESS_KEY || process.env.R2_ACCOUNT_ID
  )

  if (!hasCredentials) return 'local'

  if (missing.length > 0) {
    throw new Error(
      `Configuration Cloudflare R2 incomplète. Variables manquantes: ${missing.join(', ')}. ` +
        `Fournissez toutes les variables R2 ou retirez-les pour le mode stockage local.`
    )
  }

  return 'r2'
}
