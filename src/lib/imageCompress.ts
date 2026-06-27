// Client-side avatar compression.
//
// Why this exists: Firebase Storage now requires the Blaze (pay-as-you-go) billing plan to even
// provision a bucket — that's been true since Feb 3, 2026 (see Firebase's own Storage FAQs), so a
// project that wants to stay on the no-cost Spark plan with no card on file simply cannot use
// Cloud Storage for Firebase at all, default bucket or not. Firestore, on the other hand, stays
// fully usable on Spark. The workaround: encode the avatar as base64 and store it directly as a
// string field on the user's own Firestore document (see SettingsPage.tsx) instead of as a
// separate Storage object. Firestore's hard per-document cap is 1 MiB, so this only works at all
// if the encoded image is kept well under that — hence the aggressive client-side compression here
// targeting ~150KB of raw image bytes (roughly ~200KB once base64-encoded, comfortably inside the
// 1 MiB ceiling alongside the rest of the user's settings fields).
//
// This never touches the network — everything happens in the browser via <canvas>, so there's no
// server-side image processing to pay for either.

export const TARGET_MAX_BYTES = 150 * 1024 // 150KB, per the user's own size requirement
const MAX_DIMENSION = 512 // avatars are shown small; no reason to keep more resolution than this
const MIN_DIMENSION = 64 // refuse to shrink past the point where the image is unrecognizable

export class ImageCompressError extends Error {}

/**
 * Loads an image File into an HTMLImageElement via a blob URL, revoking the URL once decoded (or
 * on failure) so it doesn't leak.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageCompressError('Could not read this image file — it may be corrupted or an unsupported format.'))
    }
    img.src = url
  })
}

/** Converts a canvas to a data URL at a given JPEG quality, and returns its approximate byte size. */
function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): { dataUrl: string; bytes: number } {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  // Base64 encodes 3 bytes as 4 chars, so raw byte size ≈ (base64 length * 3/4), minus the
  // "data:image/jpeg;base64," prefix and any trailing '=' padding. Good enough for a size check —
  // we don't need exact precision, just to know whether we're under the target.
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const bytes = Math.floor((base64.length * 3) / 4) - padding
  return { dataUrl, bytes }
}

/**
 * Draws an image into a square canvas (center-cropped, like a profile photo), at a given target
 * dimension.
 */
function drawSquareCanvas(img: HTMLImageElement, dimension: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = dimension
  canvas.height = dimension
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageCompressError('Your browser does not support canvas image processing.')

  // Center-crop to a square source region so the output isn't stretched/distorted.
  const srcSize = Math.min(img.naturalWidth, img.naturalHeight)
  const srcX = (img.naturalWidth - srcSize) / 2
  const srcY = (img.naturalHeight - srcSize) / 2

  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, dimension, dimension)
  return canvas
}

export interface CompressResult {
  dataUrl: string
  bytes: number
  width: number
}

/**
 * Compresses an uploaded image file down to a square JPEG under `maxBytes`, returning a data URL
 * ready to store directly in Firestore.
 *
 * Strategy: start at MAX_DIMENSION with high quality, then iteratively reduce JPEG quality first
 * (cheap, preserves detail) and fall back to shrinking dimensions if quality alone can't get
 * there (some images, e.g. busy/noisy photos, compress poorly at any quality without resizing).
 * Throws ImageCompressError if even the smallest/lowest-quality attempt can't fit — this should be
 * extremely rare for a profile photo, but callers should surface the message to the user rather
 * than silently uploading something oversized.
 */
export async function compressImageToTarget(file: File, maxBytes: number = TARGET_MAX_BYTES): Promise<CompressResult> {
  if (!file.type.startsWith('image/')) {
    throw new ImageCompressError('Please choose an image file (PNG, JPEG, WEBP, etc).')
  }

  const img = await loadImage(file)

  let dimension = MAX_DIMENSION
  let best: { dataUrl: string; bytes: number } | null = null

  while (dimension >= MIN_DIMENSION) {
    const canvas = drawSquareCanvas(img, dimension)

    // Quality sweep at this dimension, from high to low.
    for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
      const attempt = canvasToDataUrl(canvas, quality)
      if (!best || attempt.bytes < best.bytes) best = attempt
      if (attempt.bytes <= maxBytes) {
        return { dataUrl: attempt.dataUrl, bytes: attempt.bytes, width: dimension }
      }
    }

    // Quality alone didn't get under the target at this size — shrink and try again.
    dimension = Math.floor(dimension * 0.75)
  }

  // Never hit the target even at the smallest size/lowest quality. Return the smallest result we
  // found rather than nothing, but make the failure explicit so the caller can decide whether
  // "smaller than what we wanted, but still reasonable" is acceptable, or whether to ask the
  // person for a different image.
  if (best) {
    throw new ImageCompressError(
      `Couldn't compress this image below ${Math.round(maxBytes / 1024)}KB even at minimum size/quality ` +
      `(smallest result was ${Math.round(best.bytes / 1024)}KB). Try a simpler image with less detail.`
    )
  }
  throw new ImageCompressError('Could not process this image.')
}
