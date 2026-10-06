import nodemailer from 'nodemailer';

export const FROM_EMAIL = 'y7087749@gmail.com';

export async function sendOtpEmail(to: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const user = process.env.EMAIL_USER || FROM_EMAIL;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  console.log(`[OTP Notification] Sent verification code ${otp} to ${to} from ${FROM_EMAIL}`);

  if (!pass) {
    const msg = `EMAIL_PASS is not configured in .env. Add your 16-character Google App Password in .env as EMAIL_PASS to deliver emails to Gmail.`;
    console.error(`[OTP Delivery] ${msg}`);
    return { success: false, error: msg };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user,
        pass: pass.replace(/\s+/g, ''),
      },
    });

    const mailOptions = {
      from: `"MedPrep / MadeMedEasy" <${FROM_EMAIL}>`,
      to,
      subject: `Your Login Verification Code: ${otp}`,
      text: `Your one-time login verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nSent from ${FROM_EMAIL}.`,
      html: `
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
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err: any) {
    console.error(`[OTP Error] Failed to send email via SMTP from ${FROM_EMAIL}:`, err);
    return { success: false, error: err.message };
  }
}
