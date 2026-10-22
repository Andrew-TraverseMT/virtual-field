import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: 'student' | 'instructor' | 'researcher'
    mustChangePassword?: boolean
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'student' | 'instructor' | 'researcher'
      mustChangePassword?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'student' | 'instructor' | 'researcher'
    mustChangePassword?: boolean
  }
}
