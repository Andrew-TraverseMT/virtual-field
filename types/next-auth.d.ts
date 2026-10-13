import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: 'student' | 'instructor' | 'consent_holder'
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'student' | 'instructor' | 'consent_holder'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'student' | 'instructor' | 'consent_holder'
  }
}
