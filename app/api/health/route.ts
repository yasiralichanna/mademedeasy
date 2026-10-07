import { client } from '../../../db';
import { boundary, json } from '../../../lib/server/http';

export const runtime = 'nodejs';

export async function GET() {
  return boundary(async () => {
    await (await client()).db(process.env.MONGODB_DB || 'medprep').command({ ping: 1 });
    return json({
      status: 'healthy',
      database: 'mongodb',
      service: 'MedPrep BCQs',
      emailConfigured: !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD),
      emailProvider: process.env.BREVO_API_KEY ? 'brevo_http' : process.env.RESEND_API_KEY ? 'resend_http' : 'gmail_smtp',
      emailFrom: process.env.EMAIL_FROM || 'y7087749@gmail.com',
    });
  });
}
