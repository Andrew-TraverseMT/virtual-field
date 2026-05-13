import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  const studentPassword = process.env.STUDENT_PASSWORD ?? 'test1234'
  const instructorPassword = process.env.INSTRUCTOR_PASSWORD ?? 'instructor1234'
  return (
    <Suspense>
      <LoginForm studentPassword={studentPassword} instructorPassword={instructorPassword} />
    </Suspense>
  )
}
