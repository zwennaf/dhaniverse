import './globals.css'
import { ReactNode } from 'react'
import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://dhaniverse.in');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Dhaniverse — Understand. Apply. Grow.',
  description: 'Master money management through India\'s first financial literacy RPG game. Learn investing, budgeting & personal finance skills. Free to play, built for Gen Z & millennials.',
  keywords: 'dhaniverse, financial literacy game, money management game, investing game, budgeting game, personal finance education, financial RPG, stock market simulator, Gen Z finance, millennial finance, gamified learning, financial education India, Understand. Apply. Grow., money skills game, investment simulator, budget simulator, financial planning game, wealth building game, banking simulation, financial wisdom, money management skills, personal finance app, financial learning platform, interactive finance education',

  openGraph: {
    title: 'Dhaniverse — Understand. Apply. Grow.',
    description: 'Master money management through India\'s first financial literacy RPG game. Learn investing, budgeting & personal finance skills.',
    url: SITE_URL + '/',
    siteName: 'Dhaniverse',
    images: [
      {
  url: '/UI/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Dhaniverse - Financial Literacy Game',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dhaniverse — Understand. Apply. Grow.',
    description: 'Master money management through India\'s first financial literacy RPG game. Learn investing, budgeting & personal finance skills.',
    images: ['/UI/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-SLRCXDGCLG"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SLRCXDGCLG', {
                page_title: document.title,
                page_location: window.location.href
              });
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
