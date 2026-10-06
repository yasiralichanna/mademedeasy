import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { check, now } from '../../lib/server/http';
export function allowed(scope: any, q: any) { return (!scope.years?.length || scope.years.includes(q.year)) && (!scope.subjects?.length || scope.subjects.includes(q.subject)) && (!scope.modules?.length || scope.modules.includes(q.module)); }
export async function activeScopes(user: string) { return (await rows('subscriptions', { "user_id": user, "status": "active", "starts": { $lte: now() }, "expires": { $gt: now() } })).map(s => ({ ...s, scope: JSON.parse(s.scope) })); }
export async function guard(user: any, q?: any) { if (user.role === 'admin')
    return; const scopes = await activeScopes(user.id); check(scopes.length, 'Your BCQ access is not active. Please check Payment & access.', 403); if (q)
    check((Array.isArray(q) ? q : [q]).every(v => scopes.some(s => allowed(s.scope, v))), 'This content is outside your package scope.', 403); }
export async function status(user: string) { const scopes = await activeScopes(user); if (scopes.length)
    return { state: 'active', expires: Math.max(...scopes.map(s => s.expires)), subscriptions: scopes }; const sub = await one('subscriptions', { "user_id": user }, { sort: { expires: -1 }, limit: 1 }); if (sub && sub.expires <= now() && sub.status === 'active') {
    const message = 'Your access has expired. Visit Payment & access to renew. [' + sub.id.slice(0, 8) + ']';
    await insert('notifications',{id:'expired-'+sub.id,user_id:user,message,created:now(),read:0},true).run();
} if (sub?.status === 'suspended')
    return { state: 'suspended', expires: sub.expires }; if (sub && sub.starts > now() && sub.status === 'active')
    return { state: 'scheduled', starts: sub.starts, expires: sub.expires }; const payment = await one('payments', { "user_id": user }, { sort: { created: -1 }, limit: 1, projection: { _id: 0, status: 1, reason: 1, created: 1 } }); if (payment?.status === 'pending')
    return { state: 'pending' }; if (payment?.status === 'rejected')
    return { state: 'rejected', reason: payment.reason }; return { state: sub ? 'expired' : 'inactive', expires: sub?.expires }; }
export function activation(payment: any, starts: number, expires: number) { const pkg=JSON.parse(payment.snapshot); return insert('subscriptions',{id:'subscription-'+payment.id,user_id:payment.user_id,payment_id:payment.id,scope:JSON.stringify(pkg.scope),starts,expires,status:'active'},true); }
