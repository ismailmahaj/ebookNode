import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateUploadFile,
  FileValidationError,
  assetTypeFromField,
} from '../services/storage/fileValidation.js'
import { buildEbookObjectKey, buildTestObjectKey } from '../services/storage/objectKeys.js'

describe('fileValidation', () => {
  it('accepte un PDF valide', () => {
    const r = validateUploadFile({
      assetType: 'PDF',
      originalname: 'book.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    })
    assert.equal(r.extension, '.pdf')
  })

  it('accepte PDF/cover en application/octet-stream (quirk navigateur)', () => {
    const pdf = validateUploadFile({
      assetType: 'PDF',
      originalname: 'book.pdf',
      mimetype: 'application/octet-stream',
      size: 1024,
    })
    assert.equal(pdf.contentType, 'application/pdf')

    const cover = validateUploadFile({
      assetType: 'COVER',
      originalname: 'c.jpg',
      mimetype: 'application/octet-stream',
      size: 1024,
    })
    assert.equal(cover.contentType, 'image/jpeg')
  })

  it('refuse un exécutable', () => {
    assert.throws(
      () =>
        validateUploadFile({
          assetType: 'PDF',
          originalname: 'virus.exe',
          mimetype: 'application/pdf',
          size: 10,
        }),
      FileValidationError
    )
  })

  it('refuse une taille trop grande', () => {
    assert.throws(
      () =>
        validateUploadFile({
          assetType: 'COVER',
          originalname: 'c.jpg',
          mimetype: 'image/jpeg',
          size: 50 * 1024 * 1024,
        }),
      (err) => err instanceof FileValidationError && err.status === 413
    )
  })

  it('normalise les chemins (Windows / traversal) en basename', () => {
    const fromPath = validateUploadFile({
      assetType: 'PDF',
      originalname: '../etc/passwd.pdf',
      mimetype: 'application/pdf',
      size: 10,
    })
    assert.equal(fromPath.safeName, 'passwd.pdf')

    const fromWin = validateUploadFile({
      assetType: 'COVER',
      originalname: 'C:\\Users\\me\\Pictures\\cover.jpg',
      mimetype: 'image/jpeg',
      size: 10,
    })
    assert.equal(fromWin.safeName, 'cover.jpg')
  })

  it('accepte un nom avec points doubles (pas un path)', () => {
    const r = validateUploadFile({
      assetType: 'PDF',
      originalname: 'chapitre 1..3.pdf',
      mimetype: 'application/pdf',
      size: 10,
    })
    assert.equal(r.safeName, 'chapitre 1..3.pdf')
  })

  it('mappe les champs multer', () => {
    assert.equal(assetTypeFromField('pdf_file'), 'PDF')
    assert.equal(assetTypeFromField('cover_image'), 'COVER')
    assert.equal(assetTypeFromField('preview_pdf'), 'PDF_PREVIEW')
  })
})

describe('objectKeys', () => {
  it('génère des clés stables pour PDF/cover', () => {
    assert.equal(buildEbookObjectKey(42, 'PDF'), 'ebooks/42/original/book.pdf')
    assert.equal(
      buildEbookObjectKey(42, 'COVER', 'photo.PNG'),
      'ebooks/42/covers/cover.png'
    )
    assert.equal(
      buildEbookObjectKey(7, 'PDF_PREVIEW'),
      'ebooks/7/preview/preview.pdf'
    )
  })

  it('refuse un ebookId invalide', () => {
    assert.throws(() => buildEbookObjectKey('x', 'PDF'))
  })

  it('génère une clé de test unique', () => {
    const a = buildTestObjectKey()
    const b = buildTestObjectKey()
    assert.match(a, /^test\//)
    assert.notEqual(a, b)
  })
})
