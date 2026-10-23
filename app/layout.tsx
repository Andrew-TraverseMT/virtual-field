import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { mustChangePassword, passwordChangeAllowedPath } from '@/lib/session'
import Providers from './providers'
import NavBar from './NavBar'
import PasswordGate from './PasswordGate'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Virtual Field Geology Basecamp',
  description: '3-week virtual geology field camp — map, analyse, and interpret.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const pathname = (await headers()).get('x-pathname')
  if (pathname && mustChangePassword(session) && !passwordChangeAllowedPath(pathname)) {
    redirect('/account/password')
  }

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-900">
        <Providers session={session}>
          <PasswordGate />
          <NavBar />
          <main className="flex flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
