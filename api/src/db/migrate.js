import { pool } from './pool.js'
import { runMigrations } from './init.js'

async function migrate() {
  const client = await pool.connect()
  try {
    await runMigrations(client)
    console.log('Migration terminée avec succès.')
  } catch (err) {
    console.error('Erreur migration:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
