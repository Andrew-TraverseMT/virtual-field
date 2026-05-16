import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'
const INSTRUCTOR_EMAIL = 'andrew.laskowski@montana.edu'
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
const APP_NAME = 'Virtual Field Geology Basecamp'

/** Sent to the instructor when a new student account is created. */
export async function sendNewStudentEmail(studentName: string, studentEmail: string, tempPassword: string) {
  await resend.emails.send({
    from: FROM,
    to: INSTRUCTOR_EMAIL,
    subject: `New student account — ${studentName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">${APP_NAME}</h2>
        <p style="color:#78716c;margin-bottom:16px">
          A new student account has been created. Share these credentials with the student.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#78716c;width:120px">Name</td><td style="padding:6px 0;font-weight:600">${studentName}</td></tr>
          <tr><td style="padding:6px 0;color:#78716c">Email</td><td style="padding:6px 0;font-weight:600">${studentEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#78716c">Temp password</td><td style="padding:6px 0;font-weight:600;font-family:monospace">${tempPassword}</td></tr>
        </table>
        <a href="${APP_URL}/instructor/students"
           style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          View student roster →
        </a>
        <p style="margin-top:24px;font-size:12px;color:#a8a29e">
          The student should log in and change their password via Account Settings.
        </p>
      </div>
    `,
  })
}

/** Sent to the instructor when a student password is reset. */
export async function sendPasswordResetEmail(studentName: string, studentEmail: string, tempPassword: string) {
  await resend.emails.send({
    from: FROM,
    to: INSTRUCTOR_EMAIL,
    subject: `Password reset — ${studentName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#18181b">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">${APP_NAME}</h2>
        <p style="color:#78716c;margin-bottom:16px">
          Password has been reset for the following student. Share the new credentials with them.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#78716c;width:120px">Name</td><td style="padding:6px 0;font-weight:600">${studentName}</td></tr>
          <tr><td style="padding:6px 0;color:#78716c">Email</td><td style="padding:6px 0;font-weight:600">${studentEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#78716c">New password</td><td style="padding:6px 0;font-weight:600;font-family:monospace">${tempPassword}</td></tr>
        </table>
        <a href="${APP_URL}/instructor/students"
           style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          View student roster →
        </a>
      </div>
    `,
  })
}
