import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { json, check } from '../../lib/server/http';
export async function handle(action: string, req: Request) { const u = await requireUser(req); if (action === 'list')
    return json(await rows('notifications', { "user_id": u.id }, { sort: { created: -1 }, limit: 100 })); if (action === 'read') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    if (p.id)
        await update('notifications', { "id": p.id, "user_id": u.id }, { read: 1 }).run();
    else
        await update('notifications', { "user_id": u.id }, { read: 1 }).run();
    return json({ message: 'Notifications marked as read.' });
} check(false, 'Route not found', 404); }
