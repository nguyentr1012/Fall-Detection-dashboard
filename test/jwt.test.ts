import { describe, it, expect } from 'vitest'
import { isJwtExpired } from '@/lib/jwt'

// Tạo JWT giả: header.payload.sig (chữ ký bất kỳ, vì ta không verify).
function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function makeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`
}

const NOW = Math.floor(Date.now() / 1000)

describe('isJwtExpired', () => {
  it('exp ở tương lai → chưa hết hạn (false)', () => {
    expect(isJwtExpired(makeJwt({ exp: NOW + 3600 }))).toBe(false)
  })

  it('exp ở quá khứ → hết hạn (true)', () => {
    expect(isJwtExpired(makeJwt({ exp: NOW - 10 }))).toBe(true)
  })

  it('không có field exp → không kết luận hết hạn (false)', () => {
    expect(isJwtExpired(makeJwt({ sub: 'user1' }))).toBe(false)
  })

  it('chuỗi không phải JWT → coi như không hợp lệ (true)', () => {
    expect(isJwtExpired('khong-phai-jwt')).toBe(true)
  })

  it('payload không decode được (base64 rác) → true', () => {
    expect(isJwtExpired('aaa.@@@notbase64@@@.sig')).toBe(true)
  })

  it('chuỗi rỗng → true', () => {
    expect(isJwtExpired('')).toBe(true)
  })

  it('leeway: token còn hạn nhưng trong khoảng leeway → coi như hết hạn (true)', () => {
    // exp còn 30s nữa, nhưng leeway 60s → now >= exp-60 → true
    expect(isJwtExpired(makeJwt({ exp: NOW + 30 }), 60)).toBe(true)
  })

  it('leeway: token còn hạn ngoài khoảng leeway → false', () => {
    expect(isJwtExpired(makeJwt({ exp: NOW + 3600 }), 60)).toBe(false)
  })

  it('exp không phải số → false (không kết luận)', () => {
    expect(isJwtExpired(makeJwt({ exp: 'soon' }))).toBe(false)
  })
})
