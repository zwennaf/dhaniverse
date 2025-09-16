import './globals.css'
import { ReactNode } from 'react'
import { Metadata } from 'next'
import Script from 'next/script';

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://dhaniverse.in');
const SITE_URL = rawSiteUrl.replace(/\/$/, '');

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
        url: `${SITE_URL}og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Dhaniverse - Financial Literacy Game',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  authors: [
    { name: "Gursimran Singh", url: "https://gursimran.me" },
    { name: "Jashanjot Singh", url: "https://github.com/singhjashanjot" },
    { name: "Aagam Jain", url: "https://aagam.framer.website" },
    { name: "Ekaspreet Singh", url: "https://ekas.site" },
  ],
  twitter: {
    card: 'summary_large_image',
    title: 'Dhaniverse — Understand. Apply. Grow.',
    description: 'Master money management through India\'s first financial literacy RPG game. Learn investing, budgeting & personal finance skills.',
    images: [`${SITE_URL}/og-image.jpg`],
    site: '@dhaniverse',
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
    google: 'xnTQeyMF3DWjzQx4CffsnDrtSaympTzVfP9a830NWjg',
  },
}

// Structured data is injected in the RootLayout to avoid exporting unexpected named symbols

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
        <Script id="dhaniverse-structured-data" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalGame",
            name: "Dhaniverse",
            description:
              "Play Dhaniverse, India's first financial literacy RPG! Learn investing, budgeting, and personal finance while having fun.",
            url: "https://dhaniverse.in/",
            applicationCategory: "GameApplication",
            gamePlatform: "Web Browser",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
            },
            creator: {
              "@type": "Organization",
              name: "Dhaniverse",
              founder: [
                {
                  "@type": "Person",
                  name: "Gursimran Singh",
                  jobTitle: "Founder & CEO",
                },
                {
                  "@type": "Person",
                  name: "Jashanjot Singh",
                  jobTitle: "Co-Founder & COO",
                },
                {
                  "@type": "Person",
                  name: "Aagam Jain",
                  jobTitle: "CPO",
                },
                {
                  "@type": "Person",
                  name: "Ekaspreet Singh",
                  jobTitle: "CTO",
                },
              ],
            },
            audience: {
              "@type": "Audience",
              audienceType: "Gen Z and Millennials",
            },
            inLanguage: "en-US",
            screenshot: "https://dhaniverse.in/og-image.jpg",
          })}
        </Script>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
