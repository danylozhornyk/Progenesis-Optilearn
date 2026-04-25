import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(
  email: string,
  fullName: string,
  token: string
) {
  const link = `${APP_URL}/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your Progenesis account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Progenesis, ${fullName}!</h2>
        <p>Please verify your email address by clicking the button below.</p>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <a href="${link}"
           style="display: inline-block; padding: 12px 24px; background: #4f46e5;
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: ${link}
        </p>
        <p style="color: #999; font-size: 12px;">
          If you didn't create an account, you can ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  token: string
) {
  const link = `${APP_URL}/auth/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Progenesis password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${fullName}, we received a request to reset your password.</p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <a href="${link}"
           style="display: inline-block; padding: 12px 24px; background: #4f46e5;
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: ${link}
        </p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request a password reset, you can ignore this email.
          Your password will not be changed.
        </p>
      </div>
    `,
  });
}
