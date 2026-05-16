import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SherpaPay — Type once. Send on Celo.',
  description: 'Plain-English stablecoin transfers for MiniPay and Celo wallets.',
  metadataBase: new URL('https://sherpapay.vercel.app'),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/sherpa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/sherpa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/sherpa-icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    title: 'SherpaPay — Type once. Send on Celo.',
    description: 'Plain-English stablecoin transfers for MiniPay and Celo wallets.',
    url: 'https://sherpapay.vercel.app',
    siteName: 'SherpaPay',
    images: [
      {
        url: '/sherpa-og-image.png',
        width: 1200,
        height: 630,
        alt: 'SherpaPay',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SherpaPay — Type once. Send on Celo.',
    description: 'Plain-English stablecoin transfers for MiniPay and Celo wallets.',
    images: ['/sherpa-og-image.png'],
  },
  other: {
    'talentapp:project_verification':
      'aa90bb30013ec23ed7e1d6bb51c3cf0206bb98e704200967b5a846fc2f831cfd18aba939e1374a1abbe11e559baec1fdaf9f66b781fabcbdbd3c2077d746b3a7',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}
