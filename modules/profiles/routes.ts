import { deleteStudent } from '../accounts/service';
import { limit } from '../auth/service';
import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { check, json, now } from '../../lib/server/http';
import { encrypt, decrypt } from '../../lib/server/crypto';
export async function handle(action: string, req: Request) { const u = await requireUser(req);
if (action === 'avatar') {
    if (req.method === 'DELETE') {
        await update('users', { id: u.id }, { avatar: null }).run();
        return json({ message: 'Profile photo deleted.', avatar: null });
    }
    const p: any = await req.json();
    if (!p.avatar) {
        await update('users', { id: u.id }, { avatar: null }).run();
        return json({ message: 'Profile photo deleted.', avatar: null });
    }
    check(typeof p.avatar === 'string', 'Invalid avatar format.');
    check(p.avatar.startsWith('data:image/') || /^https?:\/\//.test(p.avatar), 'Invalid image format.');
    check(p.avatar.length <= 3 * 1024 * 1024, 'Image exceeds maximum size of 2MB.');
    await update('users', { id: u.id }, { avatar: p.avatar }).run();
    return json({ message: 'Profile photo saved.', avatar: p.avatar });
}
if(action==='delete') { check(u.role === 'student', 'This workflow is for student accounts.', 403); await limit(req); const p:any=await req.json(); return json(await deleteStudent(u,u.id,p.password)); } check(action === 'profile', 'Route not found', 404); if (req.method === 'GET') {
    const p = await one('profiles', { "user_id": u.id });
    return json(p ? { ...p, cnic: '*****-*******-' + (await decrypt(p.cnic)).slice(-1), complete: true } : null);
} check(u.role === 'student', 'This workflow is for student accounts.', 403); const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.'); const cnic = String(p.cnic || '').replace(/-/g, ''); const existing = await one('profiles', { "user_id": u.id }); check((existing && !p.cnic) || /^\d{13}$/.test(cnic), 'CNIC must contain 13 digits.'); check(String(p.college || '').trim().length >= 3 && String(p.college).length <= 200, 'Enter your medical college.'); check(Number.isInteger(Number(p.year)) && Number(p.year) >= 1 && Number(p.year) <= 5, 'Select MBBS year 1–5.'); await upsert('profiles', { user_id: u.id }, { user_id: u.id, cnic: p.cnic ? await encrypt(cnic) : existing.cnic, college: p.college.trim(), year: Number(p.year), updated: now() }).run(); return json({ message: 'Enrollment saved.' }); }
