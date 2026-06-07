// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch, getRedirectUrl } from 'next/experimental/testing/server'
import { proxy, config } from '@/proxy'

const NOW = Math.floor(Date.now() / 1000)

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}
function makeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`
}
const VALID = makeJwt({ exp: NOW + 3600 })
const EXPIRED = makeJwt({ exp: NOW - 10 })

function makeReq(path: string, token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers.cookie = `auth_token=${token}`
  return new NextRequest(new URL(path, 'https://localhost'), { headers })
}
function redirectPath(res: Response): string | null {
  const url = getRedirectUrl(res as never)
  return url ? new URL(url).pathname : null
}

describe('proxy — matcher', () => {
  it.each(['/api/devices', '/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/sitemap.xml', '/robots.txt'])(
    'KHÔNG chạy proxy cho %s',
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
    }
  )

  it.each(['/', '/devices', '/login', '/data-collection'])('chạy proxy cho %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
  })
})

describe('proxy — auth gate', () => {
  it('không cookie + route bảo vệ → redirect /login', async () => {
    const res = await proxy(makeReq('/'))
    expect(redirectPath(res)).toBe('/login')
  })

  it('không cookie + /login → KHÔNG redirect, có header ngrok, KHÔNG có CORS', async () => {
    const res = await proxy(makeReq('/login'))
    expect(redirectPath(res)).toBeNull()
    expect(res.headers.get('ngrok-skip-browser-warning')).toBe('true')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('token hợp lệ + route bảo vệ → KHÔNG redirect, header ngrok có, không CORS', async () => {
    const res = await proxy(makeReq('/devices', VALID))
    expect(redirectPath(res)).toBeNull()
    expect(res.headers.get('ngrok-skip-browser-warning')).toBe('true')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('token hợp lệ + /login → redirect /', async () => {
    const res = await proxy(makeReq('/login', VALID))
    expect(redirectPath(res)).toBe('/')
  })

  it('token hết hạn + route bảo vệ → redirect /login và xoá cookie', async () => {
    const res = await proxy(makeReq('/', EXPIRED))
    expect(redirectPath(res)).toBe('/login')
    expect(res.headers.get('set-cookie') ?? '').toContain('auth_token=')
  })

  it('token hết hạn + /login → KHÔNG redirect (ở lại login)', async () => {
    const res = await proxy(makeReq('/login', EXPIRED))
    expect(redirectPath(res)).toBeNull()
  })

  it('token rác (không phải JWT) + route bảo vệ → redirect /login', async () => {
    const res = await proxy(makeReq('/', 'rac-khong-phai-jwt'))
    expect(redirectPath(res)).toBe('/login')
  })
})
