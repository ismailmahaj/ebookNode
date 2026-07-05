/**
 * Bloque le build Railway si VITE_API_URL n'est pas défini.
 * En local (sans RAILWAY_ENVIRONMENT), on laisse passer (proxy Vite).
 */
if (process.env.RAILWAY_ENVIRONMENT && !process.env.VITE_API_URL?.trim()) {
  console.error('')
  console.error('❌ ERREUR BUILD RAILWAY')
  console.error('   Variable VITE_API_URL manquante sur le service front.')
  console.error('   Exemple : VITE_API_URL=https://ebooknode-production-06ee.up.railway.app')
  console.error('   Voir RAILWAY.md à la racine du repo.')
  console.error('')
  process.exit(1)
}

if (process.env.VITE_API_URL) {
  console.log(`✓ VITE_API_URL = ${process.env.VITE_API_URL}`)
}
