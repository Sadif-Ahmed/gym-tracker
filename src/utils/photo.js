export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Vision models downsample internally regardless, so shipping a full-res
// phone photo (often 8-12MB+) is pure waste - it eats into the Edge
// Function's CPU-time/memory budget and slows the upload for nothing.
// Cap the long edge at 1024px and re-encode as JPEG before sending.
const MAX_PHOTO_DIMENSION = 1024
const PHOTO_JPEG_QUALITY = 0.8

export async function downscalePhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to process photo'))),
      'image/jpeg',
      PHOTO_JPEG_QUALITY
    )
  })
}
