import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config.js'

let client = null

export function isR2Configured() {
  return Boolean(
    config.r2.accountId &&
      config.r2.accessKeyId &&
      config.r2.secretAccessKey &&
      config.r2.bucketName &&
      config.r2.endpoint
  )
}

export function getR2Client() {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 n\'est pas configuré')
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
      forcePathStyle: false,
      // SDK >= 3.729 envoie des checksums CRC32 non supportés par R2 (501)
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })

    // R2 ignore encore certains headers checksum sur GetObject
    client.middlewareStack.add(
      (next) => async (args) => {
        const headers = args?.request?.headers
        if (headers) {
          for (const key of Object.keys(headers)) {
            if (/checksum/i.test(key)) {
              delete headers[key]
            }
          }
        }
        return next(args)
      },
      { step: 'build', name: 'r2StripChecksumHeaders', priority: 'high' }
    )
  }
  return client
}

export function getR2Bucket() {
  return config.r2.bucketName
}

export async function verifyR2Connection() {
  const s3 = getR2Client()
  await s3.send(new HeadBucketCommand({ Bucket: getR2Bucket() }))
  return true
}

export {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  getSignedUrl,
}
