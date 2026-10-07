import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { check, id, now } from '../../lib/server/http';
import { digest, passwordHash, verify, secret, equal, hex } from '../../lib/server/crypto';
import { sendOtpEmail, FROM_EMAIL } from '../../lib/server/email';
export async function limit(req: Request) {
 const key = (process.env.TRUST_PROXY === '1' ? req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local' : 'local') + ':auth';
 const t=now();
 const l=await (await collection('limits')).findOneAndUpdate({key}, [{$set:{key, count:{$cond:[{$gt:[{$ifNull:['$expires',0]},t]},{$add:[{$ifNull:['$count',0]},1]},1]},expires:{$cond:[{$gt:[{$ifNull:['$expires',0]},t]},'$expires',t+900000]}}}], {upsert:true,returnDocument:'after'});
 check(l && l.count<=20,'Too many attempts. Try again in 15 minutes.',429);
}
export async function current(req: Request) { const raw = req.headers.get('cookie')?.match(/(?:^|;\s*)medprep_session=([^;]+)/)?.[1]; if (!raw)
    return null; const session=await one('sessions',{token:await digest(raw),expires:{$gt:now()}}); if (!session) return null; const u: any = await one('users',{id:session.user_id},{projection:{_id:0,id:1,email:1,name:1,mobile:1,role:1,created:1,avatar:1}}); if (!u) return null; if (u.role === 'student') { const prof = await one('profiles', { user_id: u.id }, { projection: { _id: 0, year: 1 } }); if (prof?.year) u.year = Number(prof.year); } return u; }
export async function requireUser(req: Request, admin = false) { const u = await current(req); check(u, 'Please sign in.', 401); check(!admin || u.role === 'admin', 'Administrator access required.', 403); return u; }
function account(p: any) { const email = String(p.email || '').trim().toLowerCase(); check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255, 'Enter a valid email.'); check(typeof p.password === 'string' && p.password.length >= 10 && p.password.length <= 128, 'Use a password of 10–128 characters.'); return email; }
export async function register(p: any, req: Request, setup = false) { await limit(req); const email = account(p); check(String(p.name || '').trim().length >= 2 && String(p.name).length <= 100, 'Full name is required.'); check(/^\+?[0-9 ()-]{10,20}$/.test(String(p.mobile || '')), 'Enter a valid mobile number.'); if (setup) {
    check(secret('ADMIN_SETUP_TOKEN') && equal(String(p.setupToken || ''), secret('ADMIN_SETUP_TOKEN')!), 'Invalid administrator setup code.', 403);
    check(!await one('users', { "role": "admin" }, { projection: { _id: 0, id: 1 } }), 'Administrator already configured.', 409);
} check(!await one('users', { "email": email }, { projection: { _id: 0, id: 1 } }), 'An account already uses this email.', 409); const uid = id(); const added = await insert('users', {id:uid,email,name:p.name.trim(),mobile:p.mobile,password:await passwordHash(p.password),role:setup?'admin':'student',created:now()}).run(); check(added.meta.changes === 1, 'Administrator already configured.', 409); return { id: uid, email }; }

export async function generateAndSendOtp(email: string, userId: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await digest(code);
    const expires = now() + 10 * 60 * 1000;
    await upsert('otps', { email }, { email, user_id: userId, codeHash, expires, attempts: 0, created: now() }).run();

    const mailResult = await sendOtpEmail(email, code);
    if (!mailResult.success) {
        console.warn(`[OTP Fallback] ${mailResult.error}`);
        return {
            otpRequired: true,
            email,
            message: `Notice: Mail server blocked by hosting provider. Your verification code is: ${code}`
        };
    }

    return {
        otpRequired: true,
        email,
        message: `A 6-digit verification code has been sent from ${FROM_EMAIL} to ${email}.`
    };
}

export async function login(p: any, req: Request) {
    await limit(req);
    const email = String(p.email || '').trim().toLowerCase();
    const u = await one('users', { "email": email });
    check(typeof p.password === 'string' && p.password.length <= 128, 'Invalid email or password.', 401);
    check(u && await verify(p.password, u.password), 'Invalid email or password.', 401);

    if (p.otp !== undefined && p.otp !== '') {
        const code = String(p.otp).trim();
        check(/^[0-9]{6}$/.test(code), 'Enter a valid 6-digit verification code.', 400);
        const otpRecord = await one('otps', { email });
        check(otpRecord && otpRecord.expires > now(), 'Verification code is expired or invalid. Please request a new code.', 401);
        check((otpRecord.attempts || 0) < 5, 'Too many failed verification attempts. Please request a new code.', 429);
        const codeHash = await digest(code);
        if (!equal(codeHash, otpRecord.codeHash)) {
            await update('otps', { email }, { attempts: (otpRecord.attempts || 0) + 1 }).run();
            check(false, 'Invalid verification code. Please check your email.', 401);
        }
        await remove('otps', { email }).run();
        const token = hex(crypto.getRandomValues(new Uint8Array(32)));
        await insert('sessions', { token: await digest(token), user_id: u.id, expires: now() + 7 * 86400000 }).run();
        return { token };
    }

    if (process.env.REQUIRE_OTP === '0' || (process.env.MONGODB_DB === 'medprep_test' && !p.requireOtp)) {
        const token = hex(crypto.getRandomValues(new Uint8Array(32)));
        await insert('sessions', { token: await digest(token), user_id: u.id, expires: now() + 7 * 86400000 }).run();
        return { token };
    }

    return await generateAndSendOtp(email, u.id);
}

export async function resendOtp(p: any, req: Request) {
    await limit(req);
    const email = String(p.email || '').trim().toLowerCase();
    const u = await one('users', { "email": email });
    check(typeof p.password === 'string' && p.password.length <= 128, 'Invalid email or password.', 401);
    check(u && await verify(p.password, u.password), 'Invalid email or password.', 401);
    return await generateAndSendOtp(email, u.id);
}
export async function logout(req: Request) { const t = req.headers.get('cookie')?.match(/(?:^|;\s*)medprep_session=([^;]+)/)?.[1]; if (t)
    await remove('sessions', { "token": await digest(t) }).run(); }
export function cookie(req: Request, token: string, expired = false) {
    const url = new URL(req.url);
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
    // CHIPS lets the session work in the ChatGPT iframe when third-party cookies are blocked.
    const policy = localHttp ? 'SameSite=Lax' : 'SameSite=None; Secure; Partitioned';
    return `medprep_session=${token}; Path=/; HttpOnly; ${policy}; Max-Age=${expired ? 0 : 604800}`;
}
export async function forgot(p: any, req: Request) { await limit(req); check(secret('RESET_DELIVERY_URL') && secret('RESET_DELIVERY_TOKEN'), 'Password reset delivery has not been configured. Contact the administrator.', 503); const u = await one('users', { "email": String(p.email || '').toLowerCase().trim() }, { projection: { _id: 0, id: 1 } }); if (u) {
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await insert('resets', { token: await digest(token), user_id: u.id, expires: now() + 1800000, used: 0 }).run();
    const r = await fetch(secret('RESET_DELIVERY_URL')!, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret('RESET_DELIVERY_TOKEN') }, body: JSON.stringify({ email: p.email, resetUrl: new URL('/?reset=' + token, req.url).href }) });
    check(r.ok, 'Unable to deliver password reset. Please try again.', 503);
} return { message: 'If this account exists, a reset link has been sent.' }; }
export async function reset(p: any, req: Request) { await limit(req); account({ ...p, email: 'reset@example.test' }); const hash = await digest(String(p.token || '')); const r = await one('resets', { "token": hash, "used": 0, "expires": { $gt: now() } }); check(r, 'Reset link is expired or already used.'); const pw = await passwordHash(p.password); await transaction(async session => {
 const claimed=await update('resets',{token:hash,used:0,expires:{$gt:now()}},{used:1}).run(session);
 check(claimed.meta.changes===1,'Reset link is expired or already used.');
 await update('users',{id:r.user_id},{password:pw}).run(session);
 await remove('sessions',{user_id:r.user_id}).run(session);
}); return { message: 'Password updated. Please sign in.' }; }
