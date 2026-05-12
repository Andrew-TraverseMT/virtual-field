import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import Providers from './providers'
import NavBar from './NavBar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Virtual Field Camp',
  description: '3-week virtual geology field camp — map, analyse, and interpret.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-900">
        <Providers session={session}>
          <NavBar />
          <main className="flex flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
