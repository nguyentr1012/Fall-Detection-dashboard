import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // 1. Auth Logic: Redirect to login if no token
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Auth Logic: Redirect to home if logged in and trying to access login page
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const response = NextResponse.next({ request })
  response.headers.set('ngrok-skip-browser-warning', 'true')
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
