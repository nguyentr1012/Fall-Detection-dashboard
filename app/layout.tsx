import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/shared/Header'
import { GlobalAlertToaster } from '@/components/shared/GlobalAlertToaster'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fall Detection System',
  description: 'Hệ thống giám sát hành vi người già & phát hiện té ngã',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}>
        <Providers>
          <Header />
          <main className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </main>
          <GlobalAlertToaster />
        </Providers>
      </body>
    </html>
  )
}
