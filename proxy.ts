import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Bypass ngrok browser warning cho tất cả XHR/fetch request từ app
  response.headers.set('ngrok-skip-browser-warning', 'true')
  // Cho phép cross-origin iframe embed (nếu cần)
  response.headers.set('Access-Control-Allow-Origin', '*')

  return response
}

export const config = {
  // Áp dụng cho tất cả routes trừ static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
