'use server'

import { cookies } from 'next/headers'

export async function login(username: string, password: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl) {
    return { success: false, error: 'Cấu hình hệ thống lỗi: Thiếu Backend URL.' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.detail || 'Sai tên đăng nhập hoặc mật khẩu.' }
    }

    const data = await response.json()
    const token = data.access_token

    // Set HTTP-Only cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 1 day
    })

    return { success: true }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Không thể kết nối đến máy chủ.' }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
}
