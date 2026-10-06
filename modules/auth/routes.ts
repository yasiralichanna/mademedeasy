import * as auth from './service';
import { json, check } from '../../lib/server/http';
export async function handle(action: string, req: Request) { const p = req.method === 'POST' ? await req.json() : {}; if (action === 'me')
    return json({ user: await auth.current(req) }); if (action === 'register' || action === 'setup')
    return json(await auth.register(p, req, action === 'setup'), 201); if (action === 'login') {
    const result = await auth.login(p, req);
    if ('otpRequired' in result && result.otpRequired) {
        return json(result);
    }
    const r = json({ message: 'Signed in' });
    r.headers.set('Set-Cookie', auth.cookie(req, (result as any).token));
    return r;
} if (action === 'resend-otp')
    return json(await auth.resendOtp(p, req)); if (action === 'logout') {
    await auth.logout(req);
    const r = json({ message: 'Signed out' });
    r.headers.set('Set-Cookie', auth.cookie(req, '', true));
    return r;
} if (action === 'forgot')
    return json(await auth.forgot(p, req)); if (action === 'reset')
    return json(await auth.reset(p, req)); check(false, 'Route not found', 404); }
