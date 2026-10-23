import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import type { RegisteredUser } from '@/lib/db'
import type { AppRole } from '@/lib/study-access'
import { temporaryPasswordExpired } from '@/lib/passwords'

function getLegacyInstructorEmails() {
  return (process.env.INSTRUCTOR_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function resolveRole(dbUser: RegisteredUser): AppRole {
  if (dbUser.role === 'researcher') return 'researcher'
  if (dbUser.role === 'instructor') return 'instructor'
  if (dbUser.role === 'student' && getLegacyInstructorEmails().includes(dbUser.email.toLowerCase())) {
    return 'instructor'
  }
  if (dbUser.role === 'student') return 'student'
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

        const mustChange = dbUser.must_change_password === 1
        const now = Math.floor(Date.now() / 1000)
        if (temporaryPasswordExpired(mustChange, dbUser.temp_password_expires_at ?? null, now)) {
          return null
        }

        const role = resolveRole(dbUser)

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role,
          mustChangePassword: mustChange,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role: AppRole }).role
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword === true
      }
      if (trigger === 'update' && token.sub) {
        const { rows } = await sql`
          SELECT role, must_change_password FROM registered_users WHERE id = ${token.sub}
        `
        const row = rows[0] as { role?: AppRole; must_change_password?: number } | undefined
        if (row?.role === 'student' || row?.role === 'instructor' || row?.role === 'researcher') {
          token.role = row.role
          token.mustChangePassword = row.must_change_password === 1
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.sub
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { mustChangePassword?: boolean }).mustChangePassword = token.mustChangePassword === true
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
