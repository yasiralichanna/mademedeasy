import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { status } from './service';
import { auditStatement } from '../admin/audit';
import { notification } from '../notifications/service';
import { check, json, now } from '../../lib/server/http';
export async function handle(action: string, req: Request) { const u = await requireUser(req, action !== 'status'); if (action === 'status')
    return json(await status(u.id)); if (action === 'list')
    return json(await (await Promise.all((await rows('subscriptions',{}, {sort:{expires:-1}})).map(async s => { const u=await one('users',{id:s.user_id}); return {...s,name:u?.name,email:u?.email}; })))); if (action === 'update') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const s = await one('subscriptions', { "id": p.id });
    check(s, 'Subscription not found', 404);
    check(['active', 'suspended'].includes(p.status), 'Choose active or suspended.');
    const start = Number(p.starts), expires = Number(p.expires);
    check(Number.isFinite(start) && Number.isFinite(expires) && expires > start, 'Expiry must be after start.');
    await database().batch([update('subscriptions', { "id": s.id }, { starts: start, expires: expires, status: p.status }), auditStatement(u.id, 'access_updated', s.id, JSON.stringify({ starts: start, expires, status: p.status })), notification(s.user_id, p.status === 'suspended' ? 'Your BCQ access has been suspended. Contact the administrator.' : 'Your BCQ access dates have been updated.')]);
    return json({ message: 'Access updated.' });
} check(false, 'Route not found', 404); }
