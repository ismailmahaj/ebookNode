/**
 * Script de diagnostic Cloudflare R2.
 * Usage: npm run r2:test
 * Ne journalise jamais les clés secrètes.
 */
import dotenv from 'dotenv'
dotenv.config()

import { config, validateR2ConfigOrThrow } from '../src/config.js'
import { verifyR2Connection, isR2Configured } from '../src/config/r2.js'
import { buildTestObjectKey } from '../src/services/storage/objectKeys.js'
import {
  uploadObject,
  objectExists,
  getSignedDownloadUrl,
  deleteObject,
} from '../src/services/storage/r2StorageService.js'

async function main() {
  console.log('=== Test connexion Cloudflare R2 ===\n')

  try {
    const mode = validateR2ConfigOrThrow()
    if (mode !== 'r2' || !isR2Configured()) {
      console.error('ÉCHEC: R2 non configuré. Renseignez les variables R2_* dans .env')
      process.exit(1)
    }

    console.log(`Bucket: ${config.r2.bucketName}`)
    console.log(`Endpoint: ${config.r2.endpoint}`)
    console.log(`Account ID: ${config.r2.accountId.slice(0, 4)}…`)

    console.log('\n1. Vérification accès bucket…')
    await verifyR2Connection()
    console.log('   ✓ connexion réussie')

    const key = buildTestObjectKey()
    const body = Buffer.from(`r2-test ${new Date().toISOString()}`, 'utf8')

    console.log('\n2. Upload fichier test…')
    await uploadObject({
      key,
      body,
      contentType: 'text/plain',
      contentLength: body.length,
      metadata: { purpose: 'diagnostic' },
    })
    console.log('   ✓ upload réussi')

    console.log('\n3. Vérification existence…')
    const exists = await objectExists(key)
    if (!exists) throw new Error('Objet introuvable après upload')
    console.log('   ✓ objet présent')

    console.log('\n4. Génération URL signée…')
    const { expiresIn } = await getSignedDownloadUrl(key, 60)
    console.log(`   ✓ URL signée générée (expire dans ${expiresIn}s) — URL non affichée`)

    console.log('\n5. Suppression…')
    await deleteObject(key)
    const stillThere = await objectExists(key)
    if (stillThere) throw new Error('Objet encore présent après suppression')
    console.log('   ✓ suppression réussie')

    console.log('\n=== Test terminé avec succès ===')
    process.exit(0)
  } catch (err) {
    console.error('\nÉCHEC:', err.message)
    process.exit(1)
  }
}

main()
