import bcrypt from 'bcryptjs'
import { pool } from './pool.js'
import { config } from '../config.js'
import { slugify } from '../utils/slug.js'

const defaultCategories = [
  { name: 'Roman', description: 'Romans et fiction littéraire' },
  { name: 'Science-fiction', description: 'SF, fantasy et univers futuristes' },
  { name: 'Développement personnel', description: 'Bien-être, productivité, motivation' },
  { name: 'Technologie', description: 'Informatique, programmation, numérique' },
  { name: 'Histoire', description: 'Récits historiques et biographies' },
]

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const cat of defaultCategories) {
      const slug = slugify(cat.name)
      await client.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, slug, cat.description]
      )
    }
    console.log('Catégories par défaut créées.')

    const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [config.admin.email])
    if (rows.length === 0) {
      const hash = await bcrypt.hash(config.admin.password, 12)
      await client.query(
        `INSERT INTO users (name, email, password_hash, is_admin, subscription_status)
         VALUES ($1, $2, $3, TRUE, 'active')`,
        [config.admin.name, config.admin.email, hash]
      )
      console.log(`Admin créé: ${config.admin.email}`)
    } else {
      console.log('Admin déjà existant, ignoré.')
    }

    await client.query('COMMIT')
    console.log('Seed terminé.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erreur seed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
