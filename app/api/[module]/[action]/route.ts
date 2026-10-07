export const runtime = 'nodejs';
import { handle as notifications } from '../../../../modules/notifications/routes';
import { handle as admin } from '../../../../modules/admin/routes';
import { handle as attempts } from '../../../../modules/attempts/routes';
import { handle as questions } from '../../../../modules/questions/routes';
import { handle as payments } from '../../../../modules/payments/routes';
import { handle as access } from '../../../../modules/access/routes';
import { handle as packages } from '../../../../modules/packages/routes';
import { handle as analytics } from '../../../../modules/analytics/routes';
import { boundary, origin, check } from '../../../../lib/server/http';
import { handle as profiles } from '../../../../modules/profiles/routes';
import { handle as auth } from '../../../../modules/auth/routes';
async function dispatch(req: Request, ctx: any) { return boundary(async () => { if (req.method !== 'GET')
    origin(req); const { module, action } = await ctx.params; const methods: Record<string, Record<string, string[]>> = { auth: { me: ['GET'], register: ['POST'], setup: ['POST'], login: ['POST'], logout: ['POST'], forgot: ['POST'], reset: ['POST'], 'resend-otp': ['POST'] }, profiles: { profile: ['GET', 'POST'], delete: ['POST'], avatar: ['POST', 'DELETE'] }, packages: { list: ['GET', 'POST'], accounts: ['GET', 'POST'] }, payments: { list: ['GET'], admin: ['GET'], proof: ['GET'], submit: ['POST'], review: ['POST'] }, access: { status: ['GET'], list: ['GET'], update: ['POST'] }, questions: { catalog: ['GET'], admin: ['GET'], save: ['POST'], import: ['POST'], categories: ['GET', 'POST'], template: ['GET'], publish: ['POST'] }, attempts: { list: ['GET'], revision: ['GET'], bookmark: ['POST'], start: ['POST'], get: ['GET'], answer: ['POST'], flags: ['POST'], finish: ['POST'] }, analytics: { dashboard: ['GET'] }, notifications: { list: ['GET'], read: ['POST'] }, admin: { remove: ['POST'], cleanup: ['POST'], branding: ['GET', 'POST'], students: ['GET'], cnic: ['POST'], reset: ['POST'], audit: ['GET'] } }; check(methods[module]?.[action], 'Route not found', 404); check(methods[module][action].includes(req.method), 'Method not allowed', 405); if (module === 'notifications')
    return notifications(action, req); if (module === 'admin')
    return admin(action, req); if (module === 'attempts')
    return attempts(action, req); if (module === 'questions')
    return questions(action, req); if (module === 'payments')
    return payments(action, req); if (module === 'access')
    return access(action, req); if (module === 'packages')
    return packages(action, req); if (module === 'analytics')
    return analytics(action, req); if (module === 'profiles')
    return profiles(action, req); if (module === 'auth')
    return auth(action, req); check(false, 'Route not found', 404); }); }
export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;
