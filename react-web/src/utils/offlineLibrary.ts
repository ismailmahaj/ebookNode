const DB_NAME = 'ebook-offline'
const DB_VERSION = 1
const STORE = 'pdfs'

interface OfflineEbook {
  id: number
  title: string
  blob: Blob
  savedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

export async function saveOfflinePdf(ebookId: number, blob: Blob, title: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put({
      id: ebookId,
      title,
      blob,
      savedAt: new Date().toISOString(),
    } satisfies OfflineEbook)
  })
  db.close()
}

export async function getOfflinePdf(ebookId: number): Promise<Blob | null> {
  const db = await openDb()
  const record = await new Promise<OfflineEbook | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(ebookId)
    request.onsuccess = () => resolve(request.result as OfflineEbook | undefined)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return record?.blob ?? null
}

export async function hasOfflinePdf(ebookId: number): Promise<boolean> {
  const blob = await getOfflinePdf(ebookId)
  return blob !== null
}

export async function removeOfflinePdf(ebookId: number): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).delete(ebookId)
  })
  db.close()
}

export async function listOfflineEbooks(): Promise<Array<{ id: number; title: string; savedAt: string }>> {
  const db = await openDb()
  const records = await new Promise<OfflineEbook[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result as OfflineEbook[])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return records.map((r) => ({ id: r.id, title: r.title, savedAt: r.savedAt }))
}
