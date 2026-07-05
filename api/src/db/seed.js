import { pool } from './pool.js'
import { runSeed } from './init.js'

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await runSeed(client)
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
