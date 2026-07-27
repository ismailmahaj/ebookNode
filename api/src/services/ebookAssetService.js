import { query } from '../db/pool.js'
import { isR2Configured } from '../config/r2.js'
import { buildEbookObjectKey } from './storage/objectKeys.js'
import {
  uploadObject,
  deleteObject,
  objectExists,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  getObjectMetadata,
} from './storage/r2StorageService.js'
import { validateUploadFile } from './storage/fileValidation.js'

const PRIMARY_COLUMN = {
  PDF: 'pdf_object_key',
  COVER: 'cover_object_key',
  PDF_PREVIEW: 'preview_pdf_object_key',
  EPUB: 'epub_object_key',
  EPUB_PREVIEW: 'preview_epub_object_key',
}

export function formatAsset(row) {
  return {
    id: row.id,
    ebook_id: row.ebook_id,
    type: row.type,
    object_key: row.object_key,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: Number(row.size_bytes || 0),
    checksum: row.checksum || null,
    storage_provider: row.storage_provider,
    status: row.status,
    is_preview: row.is_preview,
    chapter_number: row.chapter_number,
    duration_seconds: row.duration_seconds,
    metadata: row.metadata || null,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listAssets(ebookId) {
  const { rows } = await query(
    `SELECT * FROM ebook_assets
     WHERE ebook_id = $1 AND status != 'DELETED'
     ORDER BY type, chapter_number NULLS LAST, id`,
    [ebookId]
  )
  return rows.map(formatAsset)
}

export async function getAsset(ebookId, assetId) {
  const { rows } = await query(
    `SELECT * FROM ebook_assets WHERE id = $1 AND ebook_id = $2 AND status != 'DELETED'`,
    [assetId, ebookId]
  )
  return rows[0] ? formatAsset(rows[0]) : null
}

/**
 * Upload buffer vers R2 + enregistrement asset + mise à jour colonnes ebooks.
 * Remplace l'ancien objet seulement après succès.
 */
export async function uploadEbookAsset({
  ebookId,
  assetType,
  buffer,
  originalname,
  mimetype,
  size,
  uploadedBy,
  chapterNumber,
}) {
  if (!isR2Configured()) {
    const err = new Error('R2 non configuré')
    err.status = 503
    throw err
  }

  const validated = validateUploadFile({
    assetType,
    originalname,
    mimetype,
    size: size ?? buffer.length,
  })

  const key = buildEbookObjectKey(ebookId, assetType, validated.safeName)
  const isPreview = assetType.includes('PREVIEW')

  // Ancien asset READY du même type (hors chapitres audio multiples)
  let oldKey = null
  if (assetType !== 'AUDIO_CHAPTER') {
    const existing = await query(
      `SELECT object_key FROM ebook_assets
       WHERE ebook_id = $1 AND type = $2 AND status = 'READY'
       ORDER BY id DESC LIMIT 1`,
      [ebookId, assetType]
    )
    oldKey = existing.rows[0]?.object_key || null

    const col = PRIMARY_COLUMN[assetType]
    if (col) {
      const { rows } = await query(`SELECT ${col} AS k FROM ebooks WHERE id = $1`, [ebookId])
      if (rows[0]?.k) oldKey = oldKey || rows[0].k
    }
  }

  await uploadObject({
    key,
    body: buffer,
    contentType: validated.contentType,
    contentLength: buffer.length,
    // Pas de Metadata custom : R2/S3 refuse souvent les caractères non-ASCII
    // (accents dans le nom de fichier). Les infos restent en base.
  })

  const exists = await objectExists(key)
  if (!exists) {
    const err = new Error('Upload R2 échoué: objet introuvable après envoi')
    err.status = 500
    throw err
  }

  // Soft-delete anciens assets du même type (sauf multi audio)
  if (assetType !== 'AUDIO_CHAPTER') {
    await query(
      `UPDATE ebook_assets SET status = 'DELETED', updated_at = NOW()
       WHERE ebook_id = $1 AND type = $2 AND status = 'READY'`,
      [ebookId, assetType]
    )
  }

  const { rows } = await query(
    `INSERT INTO ebook_assets (
      ebook_id, type, object_key, original_filename, mime_type, size_bytes,
      storage_provider, status, is_preview, chapter_number, uploaded_by
    ) VALUES ($1,$2,$3,$4,$5,$6,'cloudflare-r2','READY',$7,$8,$9)
    RETURNING *`,
    [
      ebookId,
      assetType,
      key,
      validated.safeName,
      validated.contentType,
      buffer.length,
      isPreview,
      chapterNumber || null,
      uploadedBy || null,
    ]
  )

  const col = PRIMARY_COLUMN[assetType]
  if (col) {
    const extra =
      assetType === 'PDF'
        ? `, pdf_file_size = $3, storage_provider = 'cloudflare-r2'`
        : `, storage_provider = 'cloudflare-r2'`
    const params =
      assetType === 'PDF'
        ? [key, ebookId, buffer.length]
        : [key, ebookId]
    await query(
      `UPDATE ebooks SET ${col} = $1${extra}, updated_at = NOW() WHERE id = $2`,
      params
    )
  } else {
    await query(
      `UPDATE ebooks SET storage_provider = 'cloudflare-r2', updated_at = NOW() WHERE id = $1`,
      [ebookId]
    )
  }

  // Supprimer ancien objet R2 si différent
  if (oldKey && oldKey !== key) {
    try {
      await deleteObject(oldKey)
    } catch (err) {
      console.warn('[R2] Échec suppression ancien objet (non bloquant)', {
        ebookId,
        assetType,
      })
    }
  }

  console.log('[R2] asset uploadé', {
    ebookId,
    assetType,
    size: buffer.length,
    assetId: rows[0].id,
  })

  return formatAsset(rows[0])
}

export async function createPresignedUpload({
  ebookId,
  assetType,
  originalname,
  mimetype,
  size,
  uploadedBy,
}) {
  const validated = validateUploadFile({ assetType, originalname, mimetype, size })
  const key = buildEbookObjectKey(ebookId, assetType, validated.safeName)

  const { rows } = await query(
    `INSERT INTO ebook_assets (
      ebook_id, type, object_key, original_filename, mime_type, size_bytes,
      storage_provider, status, is_preview, uploaded_by
    ) VALUES ($1,$2,$3,$4,$5,$6,'cloudflare-r2','PENDING',$7,$8)
    RETURNING *`,
    [
      ebookId,
      assetType,
      key,
      validated.safeName,
      validated.contentType,
      size || 0,
      assetType.includes('PREVIEW'),
      uploadedBy || null,
    ]
  )

  const signed = await getSignedUploadUrl(key, validated.contentType, 600)
  return {
    asset: formatAsset(rows[0]),
    upload: signed,
  }
}

export async function confirmPresignedUpload(ebookId, assetId) {
  const { rows } = await query(
    `SELECT * FROM ebook_assets WHERE id = $1 AND ebook_id = $2`,
    [assetId, ebookId]
  )
  if (!rows.length) {
    const err = new Error('Asset introuvable')
    err.status = 404
    throw err
  }

  const asset = rows[0]
  const exists = await objectExists(asset.object_key)
  if (!exists) {
    await query(
      `UPDATE ebook_assets SET status = 'FAILED', updated_at = NOW() WHERE id = $1`,
      [assetId]
    )
    const err = new Error('Objet absent dans R2 — upload non confirmé')
    err.status = 400
    throw err
  }

  const meta = await getObjectMetadata(asset.object_key)

  // Soft-delete previous READY same type
  if (asset.type !== 'AUDIO_CHAPTER') {
    await query(
      `UPDATE ebook_assets SET status = 'DELETED', updated_at = NOW()
       WHERE ebook_id = $1 AND type = $2 AND status = 'READY' AND id != $3`,
      [ebookId, asset.type, assetId]
    )
  }

  const { rows: updated } = await query(
    `UPDATE ebook_assets
     SET status = 'READY', size_bytes = $1, mime_type = COALESCE($2, mime_type), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [meta.contentLength || asset.size_bytes, meta.contentType, assetId]
  )

  const col = PRIMARY_COLUMN[asset.type]
  if (col) {
    if (asset.type === 'PDF') {
      await query(
        `UPDATE ebooks SET pdf_object_key = $1, pdf_file_size = $2,
         storage_provider = 'cloudflare-r2', updated_at = NOW() WHERE id = $3`,
        [asset.object_key, meta.contentLength || 0, ebookId]
      )
    } else {
      await query(
        `UPDATE ebooks SET ${col} = $1, storage_provider = 'cloudflare-r2', updated_at = NOW() WHERE id = $2`,
        [asset.object_key, ebookId]
      )
    }
  }

  console.log('[R2] upload confirmé', { ebookId, assetId, type: asset.type })
  return formatAsset(updated[0])
}

export async function softDeleteAsset(ebookId, assetId) {
  const asset = await getAsset(ebookId, assetId)
  if (!asset) {
    const err = new Error('Asset introuvable')
    err.status = 404
    throw err
  }

  try {
    await deleteObject(asset.object_key)
  } catch {
    // idempotent
  }

  await query(
    `UPDATE ebook_assets SET status = 'DELETED', updated_at = NOW() WHERE id = $1`,
    [assetId]
  )

  const col = PRIMARY_COLUMN[asset.type]
  if (col) {
    await query(
      `UPDATE ebooks SET ${col} = NULL, updated_at = NOW()
       WHERE id = $1 AND ${col} = $2`,
      [ebookId, asset.object_key]
    )
  }

  console.log('[R2] asset supprimé', { ebookId, assetId, type: asset.type })
  return true
}

export async function resolveObjectKey(ebook, format, { preview = false } = {}) {
  if (preview) {
    if (format === 'epub') {
      return ebook.preview_epub_object_key || ebook.epub_object_key || null
    }
    // Aperçu dédié, sinon PDF complet (compat web/mobile)
    return ebook.preview_pdf_object_key || ebook.pdf_object_key || null
  }
  if (format === 'epub') return ebook.epub_object_key || null
  return ebook.pdf_object_key || null
}

export async function createAccessUrl(ebook, format, { preview = false } = {}) {
  const key = await resolveObjectKey(ebook, format, { preview })
  if (!key) {
    const err = new Error(
      preview
        ? 'Aucun extrait disponible pour cet ebook'
        : `Fichier ${format} introuvable`
    )
    err.status = 404
    throw err
  }

  const { url, expiresIn } = await getSignedDownloadUrl(key)
  // Ne jamais logger l'URL
  console.log('[R2] URL signée générée', {
    ebookId: ebook.id,
    format,
    preview,
    expiresIn,
  })

  return {
    url,
    expiresIn,
    format,
    contentType:
      format === 'epub' ? 'application/epub+zip' : 'application/pdf',
    ebookId: ebook.id,
    preview,
  }
}
