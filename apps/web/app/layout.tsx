import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SherpaPay — Type once. Send forever.',
  description:
    'Plain-English payments for MiniPay — schedule recurring stablecoin transfers on Celo',
  metadataBase: new URL('https://sherpapay.vercel.app'),
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
