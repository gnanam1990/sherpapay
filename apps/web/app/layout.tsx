import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SherpaPay — Type once. Send forever.',
  description: 'Plain-English payments for MiniPay — schedule recurring stablecoin transfers on Celo',
  metadataBase: new URL('https://sherpapay.xyz'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
