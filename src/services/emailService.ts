/**
 * Production Email Service
 *
 * Uses Nodemailer with SMTP for sending transactional emails.
 *
 * Configuration (via environment variables):
 *   EMAIL_HOST    - SMTP host (e.g. smtp.gmail.com, smtp.resend.com)
 *   EMAIL_PORT    - SMTP port (default: 587 for TLS, 465 for SSL)
 *   EMAIL_SECURE  - 'true' for SSL/port 465, 'false' for TLS/STARTTLS
 *   EMAIL_USER    - SMTP username / email address
 *   EMAIL_PASS    - SMTP password or app password
 *   EMAIL_FROM    - Sender name + address (e.g. "FlyRank AI <no-reply@flyrank.ai>")
 *
 * In development (EMAIL_HOST not set): logs reset token to console only. No email sent.
 */

import nodemailer from 'nodemailer';

const isEmailConfigured =
  !!process.env.EMAIL_HOST &&
  !!process.env.EMAIL_USER &&
  !!process.env.EMAIL_PASS;

let transporter: nodemailer.Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  // Verify connection on startup
  transporter.verify((error) => {
    if (error) {
      console.error('[Email] SMTP connection failed:', error.message);
    } else {
      console.log('[Email] ✅ SMTP transporter connected successfully.');
    }
  });
} else {
  console.log('[Email] No SMTP credentials set — emails will be logged to console only (development mode).');
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'FlyRank AI <no-reply@flyrank.ai>';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

export interface SendPasswordResetEmailParams {
  toEmail: string;
  toName: string;
  resetToken: string;
}

export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
  const { toEmail, toName, resetToken } = params;
  const resetUrl = `${APP_BASE_URL}/reset-password?token=${resetToken}`;

  const subject = 'Reset Your FlyRank AI Password';
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
      <h2 style="color: #6366f1; font-size: 20px; margin-bottom: 8px;">🔐 Password Reset Request</h2>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
        Hi <strong style="color: #e2e8f0;">${toName}</strong>, we received a request to reset your FlyRank AI account password.
      </p>

      <a href="${resetUrl}"
        style="display: inline-block; background: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 700;
               padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
        Reset Password
      </a>

      <p style="color: #64748b; font-size: 12px;">
        This link expires in <strong>1 hour</strong>.
        If you did not request this, please ignore this email — your password will not be changed.
      </p>

      <hr style="border-color: #1e293b; margin: 20px 0;" />
      <p style="color: #475569; font-size: 11px;">
        FlyRank AI · Secure Token Billing & Subscription Infrastructure<br/>
        If the button above doesn't work, copy and paste this link:<br/>
        <span style="color: #6366f1; word-break: break-all;">${resetUrl}</span>
      </p>
    </div>
  `;

  const textBody = `
Hi ${toName},

You requested a password reset for your FlyRank AI account.

Reset your password by clicking this link (valid for 1 hour):
${resetUrl}

If you didn't request this, please ignore this email.

— FlyRank AI
  `.trim();

  if (!isEmailConfigured || !transporter) {
    // Development mode: log to console
    console.log('\n' + '─'.repeat(60));
    console.log('[Email - DEV MODE] Password Reset Email would be sent:');
    console.log(`  To:    ${toName} <${toEmail}>`);
    console.log(`  Token: ${resetToken}`);
    console.log(`  URL:   ${resetUrl}`);
    console.log('─'.repeat(60) + '\n');
    return;
  }

  // Production: send real email
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: `${toName} <${toEmail}>`,
    subject,
    text: textBody,
    html: htmlBody,
  });

  console.log(`[Email] ✅ Password reset email sent to ${toEmail}`);
}
