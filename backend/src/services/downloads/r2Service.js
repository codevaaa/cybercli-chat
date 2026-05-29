import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'

/**
 * Cloudflare R2 Service for CyberCli Downloads
 * R2 is S3-compatible object storage with zero egress fees.
 */

let r2Client = null
let isR2Enabled = false

function initR2() {
  if (r2Client) return r2Client

  const endpoint = process.env.R2_ENDPOINT
  const accessKey = process.env.R2_ACCESS_KEY_ID
  const secretKey = process.env.R2_SECRET_ACCESS_KEY
  const enabled = process.env.R2_ENABLED === 'true'

  if (!enabled || !endpoint || !accessKey || !secretKey) {
    console.log('[R2] Not configured. Using GitHub proxy fallback.')
    isR2Enabled = false
    return null
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  })

  isR2Enabled = true
  console.log('[R2] Client initialized for bucket:', process.env.R2_BUCKET_NAME)
  return r2Client
}

/**
 * Check if a file exists in R2
 */
export async function r2FileExists(key) {
  const client = initR2()
  if (!client || !isR2Enabled) return false

  try {
    const bucket = process.env.R2_BUCKET_NAME
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false
    }
    console.warn('[R2] HeadObject error:', err.message)
    return false
  }
}

/**
 * Get the public CDN URL for a file
 */
export function getR2PublicUrl(key) {
  const base = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT
  // Remove trailing slash and append key
  return `${base.replace(/\/+$/, '')}/${key}`
}

/**
 * Check if R2 is available
 */
export function isR2Available() {
  initR2()
  return isR2Enabled
}

export { r2Client }
