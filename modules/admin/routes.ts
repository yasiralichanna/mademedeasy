import { auditView } from './audit-view';
import { deleteStudent, cleanupProofs } from '../accounts/service';
import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { auditStatement, record } from './audit';
import { decrypt, digest, hex } from '../../lib/server/crypto';
import { check, json, now } from '../../lib/server/http';
export async function handle(action: string, req: Request) { if (action === 'branding' && req.method === 'GET') {
    const b = await one('settings', { "key": "branding" }, { projection: { _id: 0, value: 1 } });
    return json(b ? JSON.parse(b.value) : { name: 'MedPrep', suffix: 'BCQs', support: '' });
} const u = await requireUser(req, true); if(action==='cleanup') return json(await cleanupProofs()); if(action==='remove') { const p:any=await req.json(); return json(await deleteStudent(u,p.user_id,undefined,p.confirmEmail)); } if (action === 'students')
    return json(await Promise.all((await rows('users',{role:'student'},{projection:{_id:0,password:0},sort:{created:-1}})).map(async u=>{const p=await one('profiles',{user_id:u.id});return {...u,college:p?.college,year:p?.year,submissions:(await count('payments',{user_id:u.id})).count};}))); if (action === 'cnic') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const profile = await one('profiles', { "user_id": p.user_id }, { projection: { _id: 0, cnic: 1 } });
    check(profile, 'Enrollment not found', 404);
    await record(u.id, 'cnic_viewed', p.user_id, 'Sensitive identity viewed');
    return json({ cnic: await decrypt(profile.cnic) });
} if (action === 'reset') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const target = await one('users', { "id": p.user_id }, { projection: { _id: 0, id: 1, email: 1 } });
    check(target, 'Student not found', 404);
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await database().batch([insert('resets', { token: await digest(token), user_id: target.id, expires: now() + 1800000, used: 0 }), auditStatement(u.id, 'reset_link_issued', target.id)]);
    return json({ url: new URL('/?reset=' + token, req.url).href, message: 'Single-use link expires in 30 minutes. Verify the student’s identity before sharing it privately.' });
} if (action === 'audit')
    return json(await Promise.all((await rows('audit',{}, {sort:{created:-1},limit:200})).map(async a=>{const actor=await one('users',{id:a.actor});const target=await one('users',{id:a.target});return auditView({...a,actor_name:actor?.name,actor_role:actor?.role,target_name:target?.name});}))); if (action === 'branding') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    check(typeof p.name === 'string' && p.name.trim().length >= 2 && p.name.length <= 25, 'Brand name must contain 2–25 characters.');
    check(!p.support || /^https:\/\//.test(p.support), 'Support must be an HTTPS URL.');
    await database().batch([upsert('settings', { key: "branding" }, { key: "branding", value: JSON.stringify({ name: p.name.trim(), suffix: String(p.suffix || '').slice(0, 12), support: p.support || '' }) }), auditStatement(u.id, 'branding_saved', 'branding')]);
    return json({ message: 'Branding saved. Refresh the workspace to see changes.' });
} check(false, 'Route not found', 404); }
