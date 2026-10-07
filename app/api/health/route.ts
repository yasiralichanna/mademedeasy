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
      emailConfigured: !!(process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD),
      emailFrom: process.env.EMAIL_FROM || 'y7087749@gmail.com',
      emailUser: process.env.EMAIL_USER || 'y7087749@gmail.com',
    });
  });
}
