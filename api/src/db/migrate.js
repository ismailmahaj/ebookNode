import { pool } from './pool.js'

const migrations = `
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

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(migrations)
    await client.query('COMMIT')
    console.log('Migration terminée avec succès.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erreur migration:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
