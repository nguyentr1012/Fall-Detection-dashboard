import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isJwtExpired } from '@/lib/jwt'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  // Coi là đã đăng nhập khi có token VÀ token chưa hết hạn (đọc `exp`, không verify chữ ký).
  const authed = !!token && !isJwtExpired(token)
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // Chưa auth (thiếu HOẶC hết hạn) + không ở /login → đá về /login, xoá cookie chết.
  if (!authed && !isLoginPage) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    if (token) res.cookies.delete('auth_token')
    return res
  }

  // Đã auth mà vào /login → đưa về trang chủ.
  if (authed && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const response = NextResponse.next({ request })
  // ngrok tunnel: bỏ trang cảnh báo interstitial khi `npm run share`.
  response.headers.set('ngrok-skip-browser-warning', 'true')
  // Không set Access-Control-Allow-Origin: '*' nữa — CORS cho API là việc của backend,
  // header này vô dụng trên response trang (HTML/RSC) và là smell bảo mật.
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
