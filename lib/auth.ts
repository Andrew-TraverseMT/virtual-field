import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { sql } from '@/lib/db'
import type { RegisteredUser } from '@/lib/db'

function getLegacyInstructorEmails() {
  return (process.env.INSTRUCTOR_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
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

        const hardcoded = [
          {
            id: 'student-001',
            name: 'Test Student',
            email: 'student@virtualfield.dev',
            password: process.env.STUDENT_PASSWORD ?? 'test1234',
            role: 'student' as const,
          },
          {
            id: 'instructor-001',
            name: 'Instructor',
            email: 'instructor@virtualfield.dev',
            password: process.env.INSTRUCTOR_PASSWORD ?? 'instructor1234',
            role: 'instructor' as const,
          },
        ]

        const match = hardcoded.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password
        )
        if (match) {
          return { id: match.id, name: match.name, email: match.email, role: match.role }
        }

        // Check registered users
        const { rows } = await sql`SELECT * FROM registered_users WHERE email = ${credentials.email.toLowerCase()} AND verified = 1`
        const dbUser = rows[0] as RegisteredUser | undefined

        if (!dbUser) return null

        const passwordOk = await bcrypt.compare(credentials.password, dbUser.password_hash)
        if (!passwordOk) return null

        const role = dbUser.role === 'instructor'
          ? 'instructor'
          : getLegacyInstructorEmails().includes(dbUser.email.toLowerCase())
            ? 'instructor'
            : 'student'

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: role as 'student' | 'instructor',
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: 'student' | 'instructor' }).role
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
