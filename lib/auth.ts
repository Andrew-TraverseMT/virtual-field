import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import type { RegisteredUser } from '@/lib/db'
import type { AppRole } from '@/lib/study-access'

function getLegacyInstructorEmails() {
  return (process.env.INSTRUCTOR_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function resolveRole(dbUser: RegisteredUser): AppRole {
  if (dbUser.role === 'instructor' || dbUser.role === 'consent_holder' || dbUser.role === 'student') {
    if (dbUser.role === 'student' && getLegacyInstructorEmails().includes(dbUser.email.toLowerCase())) {
      return 'instructor'
    }
    return dbUser.role
  }
  if (getLegacyInstructorEmails().includes(dbUser.email.toLowerCase())) return 'instructor'
  return 'student'
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { rows } = await sql`SELECT * FROM registered_users WHERE email = ${credentials.email.toLowerCase()} AND verified = 1`
        const dbUser = rows[0] as RegisteredUser | undefined

        if (!dbUser) return null

        const passwordOk = await bcrypt.compare(credentials.password, dbUser.password_hash)
        if (!passwordOk) return null

        const role = resolveRole(dbUser)

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: AppRole }).role
      return token
    },
    session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.sub
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
