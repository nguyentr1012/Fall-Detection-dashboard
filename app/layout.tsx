import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { AppShell } from '@/components/layout/AppShell'
import { GlobalAlertToaster } from '@/components/shared/GlobalAlertToaster'
import { GlobalMqttInit } from '@/components/shared/GlobalMqttInit'
import { FallDetectionOverlay } from '@/components/features/dashboard/FallDetectionOverlay'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VitalsGuard AI — Fall Detection',
  description: 'Hệ thống giám sát hành vi người già & phát hiện té ngã',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <GlobalMqttInit />
          <AppShell>
            {children}
          </AppShell>
          <GlobalAlertToaster />
          <FallDetectionOverlay />
        </Providers>
      </body>
    </html>
  )
}
