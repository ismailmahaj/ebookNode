import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { slugify } from '../utils/slug.js'

export const migrations = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_status VARCHAR(50),
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ebooks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  author VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  isbn VARCHAR(50),
  cover_image_path VARCHAR(500) NOT NULL,
  pdf_file_path VARCHAR(500) NOT NULL,
  pdf_file_size BIGINT NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL DEFAULT 0,
  preview_pages INTEGER NOT NULL DEFAULT 10,
  published_at DATE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ebook_category (
  ebook_id INTEGER NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (ebook_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_ebooks_is_active ON ebooks(is_active);
CREATE INDEX IF NOT EXISTS idx_ebooks_is_featured ON ebooks(is_featured);
CREATE INDEX IF NOT EXISTS idx_ebooks_published_at ON ebooks(published_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`

const defaultCategories = [
  { name: 'Roman', description: 'Romans et fiction littéraire' },
  { name: 'Science-fiction', description: 'SF, fantasy et univers futuristes' },
  { name: 'Développement personnel', description: 'Bien-être, productivité, motivation' },
  { name: 'Technologie', description: 'Informatique, programmation, numérique' },
  { name: 'Histoire', description: 'Récits historiques et biographies' },
]

const subscriptionMigrations = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS airwallex_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS airwallex_subscription_id VARCHAR(255);

CREATE TABLE IF NOT EXISTS billing_events (
  id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

export async function runMigrations(client) {
  await client.query('BEGIN')
  try {
    await client.query(migrations)
    await client.query(subscriptionMigrations)
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

export async function runSeed(client) {
  for (const cat of defaultCategories) {
    const slug = slugify(cat.name)
    await client.query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [cat.name, slug, cat.description]
    )
  }

  const email = config.admin.email.trim().toLowerCase()
  const { rows } = await client.query('SELECT id, is_admin FROM users WHERE email = $1', [email])
  const hash = await bcrypt.hash(config.admin.password, 12)

  if (rows.length === 0) {
    await client.query(
      `INSERT INTO users (name, email, password_hash, is_admin, subscription_status)
       VALUES ($1, $2, $3, TRUE, 'active')`,
      [config.admin.name, email, hash]
    )
    console.log(`Admin créé: ${email}`)
    return
  }

  if (!rows[0].is_admin) {
    await client.query(
      `UPDATE users SET is_admin = TRUE, password_hash = $1, subscription_status = 'active', updated_at = NOW()
       WHERE email = $2`,
      [hash, email]
    )
    console.log(`Utilisateur promu admin: ${email}`)
    return
  }

  // Ré-assurer is_admin=true (correction si flag perdu)
  await client.query(
    `UPDATE users SET is_admin = TRUE, subscription_status = 'active', updated_at = NOW()
     WHERE email = $1 AND is_admin = FALSE`,
    [email]
  )

  if (config.admin.syncPassword) {
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
      [hash, email]
    )
    console.log(`Mot de passe admin synchronisé: ${email}`)
    return
  }

  console.log(`Admin déjà existant: ${email}`)
}

export async function initDatabase(pool) {
  const client = await pool.connect()
  try {
    await runMigrations(client)
    console.log('Migration OK')
    await runSeed(client)
    console.log('Seed OK')
  } finally {
    client.release()
  }
}
