import { ApiError } from '@/lib/api'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
// Batas ini disamakan dengan backend. Kalau backend mengubahnya, ubah di sini juga,
// karena pemeriksaan di klien cuma untuk menghemat unggahan yang pasti ditolak.
export const MAX_BYTES = 5 * 1024 * 1024
export const MIN_SIDE = 400
export const GALLERY_MAX = 8

function readSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(url)
    }
    image.src = url
  })
}

// Pesan galat bila berkas pasti ditolak, null bila layak diunggah.
export async function checkImage(file: File): Promise<string | null> {
  if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name} bukan JPG, PNG, atau WebP.`
  if (file.size > MAX_BYTES) return `${file.name} lebih dari 5 MB. Kecilkan dulu ukurannya.`
  const size = await readSize(file)
  if (!size) return `${file.name} tidak bisa dibaca sebagai gambar.`
  if (size.width < MIN_SIDE || size.height < MIN_SIDE) {
    return `${file.name} berukuran ${size.width}x${size.height} px. Minimal ${MIN_SIDE}x${MIN_SIDE} px supaya tidak pecah.`
  }
  return null
}

const UPLOAD_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE: 'Berkas terlalu besar untuk server. Kecilkan dulu ukurannya.',
  UNSUPPORTED_MEDIA_TYPE: 'Format gambar tidak didukung. Pakai JPG, PNG, atau WebP.',
  IMAGE_TOO_SMALL: `Gambar terlalu kecil. Minimal ${MIN_SIDE}x${MIN_SIDE} px.`,
  IMAGE_TOO_LARGE: 'Dimensi gambar terlalu besar. Perkecil resolusinya lalu coba lagi.',
  GALLERY_FULL: `Galeri sudah berisi ${GALLERY_MAX} gambar. Hapus satu dulu.`,
}

export function uploadErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code && UPLOAD_ERRORS[cause.code]) return UPLOAD_ERRORS[cause.code]
    if (cause.status === 413) return UPLOAD_ERRORS.FILE_TOO_LARGE
    if (cause.status === 415) return UPLOAD_ERRORS.UNSUPPORTED_MEDIA_TYPE
    return cause.message
  }
  return 'Unggahan gagal. Coba lagi.'
}
