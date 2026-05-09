import nodemailer from 'nodemailer';

const FROM_NAME = 'Progenesis';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Lazy-initialised so module load never throws when env vars are absent.
let _transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables must be set');
    }
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'LOGIN', user, pass },
    });
  }
  return _transporter;
}

function fromAddress() {
  const user = process.env.GMAIL_USER ?? 'noreply@example.com';
  return `"${FROM_NAME}" <${user}>`;
}

/** Sends a message and throws if the transport fails. */
async function send(options: nodemailer.SendMailOptions) {
  await getTransporter().sendMail(options);
}

// ── Shared email wrapper ──────────────────────────────────────
function emailWrapper(body: string) {
  return `
  <div style="background:#f8fafc;padding:40px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;
                box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
      ${body}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:24px;">
      &copy; ${new Date().getFullYear()} Progenesis &middot; All rights reserved
    </p>
  </div>`;
}

// ── Verification email ────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  fullName: string,
  token: string,
) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  await send({
    from: fromAddress(),
    to: email,
    subject: 'Verify your Progenesis account',
    html: emailWrapper(`
      <div style="background:#4f46e5;padding:32px 40px;">
        <p style="color:#c7d2fe;font-size:13px;font-weight:600;letter-spacing:2px;margin:0 0 8px;">PROGENESIS</p>
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Verify your email</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="color:#1e293b;font-size:16px;margin:0 0 12px;">Hi <strong>${fullName}</strong>!</p>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Please verify your email address by clicking the button below.<br>
          This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;
                  text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Verify Email
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px;">
          Or copy this link: <a href="${link}" style="color:#6366f1;">${link}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:8px;">
          If you didn't create an account, you can ignore this email.
        </p>
      </div>
    `),
  });
}

// ── Password reset email ──────────────────────────────────────

export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  token: string,
) {
  const link = `${APP_URL}/reset-password?token=${token}`;

  await send({
    from: fromAddress(),
    to: email,
    subject: 'Reset your Progenesis password',
    html: emailWrapper(`
      <div style="background:#4f46e5;padding:32px 40px;">
        <p style="color:#c7d2fe;font-size:13px;font-weight:600;letter-spacing:2px;margin:0 0 8px;">PROGENESIS</p>
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Password Reset</h1>
      </div>
      <div style="padding:36px 40px;">
        <p style="color:#1e293b;font-size:16px;margin:0 0 12px;">Hi <strong>${fullName}</strong>,</p>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">
          We received a request to reset your password.<br>
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#ffffff;
                  text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px;">
          Or copy this link: <a href="${link}" style="color:#6366f1;">${link}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:8px;">
          If you didn't request a password reset, your password will not be changed.
        </p>
      </div>
    `),
  });
}

// ── Certificate email ─────────────────────────────────────────

interface CertificateEmailOptions {
  email: string;
  fullName: string;
  courseName: string;
  successRate: number;
  issuedAt: Date;
  pdfBytes: Uint8Array;
}

export async function sendCertificateEmail({
  email,
  fullName,
  courseName,
  successRate,
  issuedAt,
  pdfBytes,
}: CertificateEmailOptions) {
  const rate = Math.round(successRate);
  const dateStr = issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const certificateHtml = `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:36px 40px 32px;">

          <!-- Orange dot + heading -->
          <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 6px;">
            <tr>
              <td style="vertical-align:middle;padding-right:8px;">
                <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></div>
              </td>
              <td style="vertical-align:middle;">
                <p style="font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;
                          letter-spacing:2px;color:#6b7280;margin:0;">
                  CERTIFICATE OF COMPLETION
                </p>
              </td>
            </tr>
          </table>

          <!-- Thin divider -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 24px;">
            <tr><td style="border-top:1px solid #e5e7eb;">&nbsp;</td></tr>
          </table>

          <!-- "This certifies that" -->
          <p style="text-align:center;font-family:Georgia,'Times New Roman',serif;
                    font-style:italic;color:#4f46e5;font-size:13px;margin:0 0 10px;">
            This certifies that
          </p>

          <!-- Full name -->
          <p style="text-align:center;font-family:Georgia,'Times New Roman',serif;
                    font-size:30px;font-weight:700;color:#111827;margin:0 0 8px;line-height:1.2;">
            ${fullName}
          </p>

          <!-- "has successfully completed" -->
          <p style="text-align:center;font-family:Georgia,'Times New Roman',serif;
                    font-style:italic;color:#4f46e5;font-size:13px;margin:0 0 10px;">
            has successfully completed
          </p>

          <!-- Course name -->
          <p style="text-align:center;font-family:Georgia,'Times New Roman',serif;
                    font-size:20px;font-weight:700;color:#111827;margin:0 0 28px;line-height:1.3;">
            ${courseName}
          </p>

          <!-- Two bottom panels -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <!-- Left: Final Score (amber) -->
              <td width="48%" style="background:#fef9c3;border-radius:8px;padding:18px 16px;text-align:center;vertical-align:top;">
                <p style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#6b7280;
                          letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">
                  Final Score
                </p>
                <p style="font-family:Helvetica,Arial,sans-serif;font-size:36px;font-weight:700;
                          color:#16a34a;margin:0;line-height:1;">
                  ${rate}%
                </p>
              </td>
              <td width="4%">&nbsp;</td>
              <!-- Right: Status (white with border) -->
              <td width="48%" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;
                                     padding:18px 16px;text-align:center;vertical-align:top;">
                <p style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#6b7280;
                          letter-spacing:1px;text-transform:uppercase;margin:0 0 10px;">
                  Status
                </p>
                <!-- Passed badge -->
                <table cellpadding="0" cellspacing="0" align="center"
                       style="background:#dcfce7;border-radius:100px;margin:0 auto;">
                  <tr>
                    <td style="padding:6px 18px;">
                      <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;
                                color:#16a34a;margin:0;">
                        &#10003; Passed
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Issue date -->
          <p style="text-align:center;font-family:Helvetica,Arial,sans-serif;
                    font-size:10px;color:#9ca3af;margin:0;">
            Issued on ${dateStr}
          </p>

        </td>
      </tr>
    </table>
  `;

  await send({
    from: fromAddress(),
    to: email,
    subject: `Your Certificate for "${courseName}" — Progenesis`,
    html: emailWrapper(`
      <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px 32px;">
        <p style="color:#c7d2fe;font-size:12px;font-weight:700;letter-spacing:3px;margin:0 0 10px;">
          PROGENESIS
        </p>
        <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;font-weight:700;line-height:1.2;">
          Congratulations, ${fullName}!
        </h1>
        <p style="color:#e0e7ff;font-size:14px;margin:0;line-height:1.5;">
          You've earned your certificate of completion.
        </p>
      </div>
      <div style="padding:32px 40px 16px;">
        <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 8px;">
          We're thrilled to recognise your achievement! You successfully completed
          <strong style="color:#1e293b;">${courseName}</strong> with a
          <strong style="color:#4f46e5;">${rate}% success rate</strong> on tests.
        </p>
        <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
          Your PDF certificate is attached to this email — keep it as a permanent record
          of your accomplishment.
        </p>
        ${certificateHtml}
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;line-height:1.6;text-align:center;">
          This certificate was issued on ${dateStr} by Progenesis.<br>
          It certifies successful completion of all required lessons and assessments.
        </p>
      </div>
    `),
    attachments: [
      {
        filename: `Progenesis_Certificate_${courseName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      },
    ],
  });
}
