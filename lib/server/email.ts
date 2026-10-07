import nodemailer from 'nodemailer';

export const FROM_EMAIL = 'y7087749@gmail.com';

export async function sendOtpEmail(to: string, otp: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[OTP Notification] Verification code ${otp} for ${to} from ${FROM_EMAIL}`);

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="margin-bottom: 24px; border-bottom: 2px solid #087c80; padding-bottom: 12px;">
        <h2 style="color: #087c80; margin: 0; font-size: 22px;">MedPrep / MadeMedEasy</h2>
      </div>
      <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Login Verification Code</h3>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Enter the following 6-digit one-time code to complete your sign in:</p>
      <div style="margin: 28px 0; text-align: center;">
        <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 16px 28px; background-color: #f0fdfa; border: 1.5px dashed #0d9488; border-radius: 10px; color: #087c80; display: inline-block;">
          ${otp}
        </div>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This verification code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Sent securely from <strong>${FROM_EMAIL}</strong>.</p>
    </div>
  `;

  // 1. HTTP REST API: Brevo (Works over Port 443 — bypasses cloud SMTP port blocks like Render Free)
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'MedPrep / MadeMedEasy', email: FROM_EMAIL },
          to: [{ email: to }],
          subject: `Your Login Verification Code: ${otp}`,
          htmlContent: htmlBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.message || 'Brevo API error' };
      return { success: true };
    } catch (e: any) {
      console.error('[Brevo Error]', e);
      return { success: false, error: e.message };
    }
  }

  // 2. HTTP REST API: Resend (Works over Port 443)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'MadeMedEasy <onboarding@resend.dev>',
          to: [to],
          subject: `Your Login Verification Code: ${otp}`,
          html: htmlBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.message || 'Resend API error' };
      return { success: true };
    } catch (e: any) {
      console.error('[Resend Error]', e);
      return { success: false, error: e.message };
    }
  }

  // 3. SMTP (Google Gmail SMTP Port 465 with 3.5s timeout)
  const user = process.env.EMAIL_USER || FROM_EMAIL;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!pass) {
    const msg = `EMAIL_PASS is not configured in environment variables.`;
    console.error(`[OTP Delivery] ${msg}`);
    return { success: false, error: msg };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      connectionTimeout: 3500, // Fail fast if hosting provider blocks outbound SMTP
      greetingTimeout: 3500,
      socketTimeout: 3500,
      auth: {
        user,
        pass: pass.replace(/\s+/g, ''),
      },
    });

    await transporter.sendMail({
      from: `"MedPrep / MadeMedEasy" <${FROM_EMAIL}>`,
      to,
      subject: `Your Login Verification Code: ${otp}`,
      text: `Your one-time login verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nSent from ${FROM_EMAIL}.`,
      html: htmlBody,
    });

    return { success: true };
  } catch (err: any) {
    console.error(`[OTP Error] Failed to send email via SMTP from ${FROM_EMAIL}:`, err);
    const isTimeout = err.code === 'ETIMEDOUT' || err.message?.includes('timeout');
    const errorMsg = isTimeout
      ? 'Render Free Tier blocks outbound SMTP (ports 465/587). Deploy on Vercel or use an HTTP Email API (Brevo/Resend).'
      : err.message;
    return { success: false, error: errorMsg };
  }
}
