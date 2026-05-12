import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
const APP_NAME = 'Virtual Field Geology Basecamp'

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Verify your ${APP_NAME} account`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Welcome, ${name}</h2>
        <p style="color:#78716c;margin-bottom:24px">
          Click the button below to verify your email and activate your
          <strong>${APP_NAME}</strong> account.
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          Verify Email
        </a>
        <p style="margin-top:24px;font-size:12px;color:#a8a29e">
          Or copy this link: ${verifyUrl}<br>
          This link expires in 24 hours.
          If you did not create an account, you can ignore this email.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Password reset</h2>
        <p style="color:#78716c;margin-bottom:24px">
          Hi ${name}, we received a request to reset your <strong>${APP_NAME}</strong> password.
          Click below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          Reset Password
        </a>
        <p style="margin-top:24px;font-size:12px;color:#a8a29e">
          Or copy this link: ${resetUrl}<br>
          This link expires in 1 hour.
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
