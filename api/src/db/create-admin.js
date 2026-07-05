import { pool } from './pool.js'
import { config } from '../config.js'
import { runSeed } from './init.js'

async function createAdmin() {
  if (!config.admin.email || !config.admin.password) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis.')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await runSeed(client)
    await client.query('COMMIT')
    console.log('Compte admin prêt.')
    console.log(`Email: ${config.admin.email}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erreur:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createAdmin()
