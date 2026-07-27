import {
  getR2Client,
  getR2Bucket,
  isR2Configured,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  getSignedUrl,
} from '../../config/r2.js'
import { config } from '../../config.js'

function requireR2() {
  if (!isR2Configured()) {
    const err = new Error('Stockage R2 indisponible')
    err.status = 503
    throw err
  }
}

function stringMeta(metadata = {}) {
  const out = {}
  for (const [k, v] of Object.entries(metadata)) {
    if (v == null) continue
    // S3 metadata: ASCII strings only
    out[String(k).toLowerCase()] = String(v).slice(0, 1024)
  }
  return out
}

export async function uploadObject({
  key,
  body,
  contentType,
  contentLength,
  metadata,
  cacheControl,
}) {
  requireR2()
  const client = getR2Client()
  const params = {
    Bucket: getR2Bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: stringMeta(metadata),
  }
  if (contentLength != null) params.ContentLength = contentLength
  if (cacheControl) params.CacheControl = cacheControl

  await client.send(new PutObjectCommand(params))
  return { key, bucket: getR2Bucket() }
}

export async function uploadStream(params) {
  return uploadObject(params)
}

export async function getSignedDownloadUrl(key, expiresIn) {
  requireR2()
  const ttl = expiresIn ?? config.r2.signedUrlExpirationSeconds
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
  })
  const url = await getSignedUrl(client, command, { expiresIn: ttl })
  return { url, expiresIn: ttl }
}

export async function getSignedUploadUrl(key, contentType, expiresIn = 600) {
  requireR2()
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
    ContentType: contentType,
  })
  const url = await getSignedUrl(client, command, { expiresIn })
  return { url, expiresIn, key }
}

export async function deleteObject(key) {
  requireR2()
  try {
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
    )
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw err
  }
  return true
}

export async function deleteObjects(keys) {
  requireR2()
  if (!keys?.length) return
  await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: getR2Bucket(),
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
        Quiet: true,
      },
    })
  )
}

export async function objectExists(key) {
  requireR2()
  try {
    await getR2Client().send(
      new HeadObjectCommand({ Bucket: getR2Bucket(), Key: key })
    )
    return true
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw err
  }
}

export async function getObjectMetadata(key) {
  requireR2()
  const res = await getR2Client().send(
    new HeadObjectCommand({ Bucket: getR2Bucket(), Key: key })
  )
  return {
    contentType: res.ContentType,
    contentLength: res.ContentLength,
    metadata: res.Metadata || {},
    lastModified: res.LastModified,
    etag: res.ETag,
  }
}

export async function getObjectStream(key) {
  requireR2()
  const res = await getR2Client().send(
    new GetObjectCommand({ Bucket: getR2Bucket(), Key: key })
  )
  return {
    body: res.Body,
    contentType: res.ContentType || 'application/octet-stream',
    contentLength: res.ContentLength,
  }
}

export async function copyObject(sourceKey, destinationKey) {
  requireR2()
  await getR2Client().send(
    new CopyObjectCommand({
      Bucket: getR2Bucket(),
      CopySource: `${getR2Bucket()}/${sourceKey}`,
      Key: destinationKey,
    })
  )
}

export async function listObjectsByPrefix(prefix, maxKeys = 1000) {
  requireR2()
  const res = await getR2Client().send(
    new ListObjectsV2Command({
      Bucket: getR2Bucket(),
      Prefix: prefix,
      MaxKeys: maxKeys,
    })
  )
  return (res.Contents || []).map((o) => ({
    key: o.Key,
    size: o.Size,
    lastModified: o.LastModified,
  }))
}
