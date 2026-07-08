import dotenv from 'dotenv'

dotenv.config()

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
}
