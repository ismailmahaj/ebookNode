import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
})

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL inattendue:', err)
})

export async function query(text, params) {
  return pool.query(text, params)
}
