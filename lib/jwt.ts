// Tiện ích JWT phía client/server-edge: chỉ ĐỌC payload, KHÔNG verify chữ ký.
// Backend (FastAPI) mới là nguồn xác thực thật trên mọi API call; ở proxy.ts ta chỉ
// cần chặn sớm token đã hết hạn để khỏi cho vào trang rồi mới fail API.

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    b64 = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

/**
 * Trả về true nếu token coi như KHÔNG dùng được:
 * - không decode được payload (không phải JWT hợp lệ) → true
 * - có `exp` và đã quá hạn (tính cả leeway giây) → true
 * - không có `exp` → false (không kết luận hết hạn)
 */
export function isJwtExpired(token: string, leewaySec = 0): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload) return true
  const exp = payload.exp
  if (typeof exp !== 'number') return false
  return Date.now() / 1000 >= exp - leewaySec
}
