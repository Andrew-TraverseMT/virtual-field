import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

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

        const users = [
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

        const user = users.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password
        )

        if (!user) return null
        return { id: user.id, name: user.name, email: user.email, role: user.role as 'student' | 'instructor' }
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
