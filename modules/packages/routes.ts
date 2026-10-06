import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { auditStatement } from '../admin/audit';
import { check, json, id } from '../../lib/server/http';
export function scopeValidate(scope: any) { check(scope && typeof scope === 'object' && !Array.isArray(scope), 'Scope must be an object.'); for (const k of ['years', 'subjects', 'modules']) {
    check(Array.isArray(scope[k] || []), 'Scope fields must be arrays.');
    if (k === 'years')
        check((scope[k] || []).every((v: any) => Number.isInteger(v) && v >= 1 && v <= 5), 'Invalid scope year.');
    else
        check((scope[k] || []).every((v: any) => typeof v === 'string' && v.length < 200), 'Invalid academic scope.');
} return { years: scope.years || [], subjects: scope.subjects || [], modules: scope.modules || [] }; }
export async function handle(action: string, req: Request) { const u = await requireUser(req, req.method === 'POST'); if (action === 'list') {
    if (req.method === 'GET') {
        if (u.role === 'admin') {
            return json(await rows('packages', {}, { sort: { price: 1 } }));
        }
        const prof = await one('profiles', { user_id: u.id });
        const studentYear = prof?.year ? Number(prof.year) : null;
        const all = await rows('packages', { active: 1 }, { sort: { price: 1 } });
        if (!studentYear) {
            return json(all);
        }
        const matching = all.filter(pkg => {
            try {
                const sc = typeof pkg.scope === 'string' ? JSON.parse(pkg.scope) : (pkg.scope || {});
                const pkgYear = pkg.year !== undefined && pkg.year !== null ? Number(pkg.year) : null;
                if (pkgYear !== null) {
                    return pkgYear === studentYear;
                }
                if (Array.isArray(sc.years) && sc.years.length > 0) {
                    return sc.years.includes(studentYear);
                }
                return true;
            } catch {
                return true;
            }
        });
        return json(matching);
    }
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    check(String(p.name || '').trim().length > 1, 'Package name is required.');
    check(Number.isInteger(p.price) && p.price > 0, 'Price must be positive PKR paisa.');
    check(Number.isInteger(p.days) && p.days >= 1 && p.days <= 3650, 'Duration must be 1–3650 days.');
    let targetYear: number | null = null;
    if (p.year !== undefined && p.year !== null && p.year !== '' && p.year !== 'all') {
        const y = Number(p.year);
        check(Number.isInteger(y) && y >= 1 && y <= 5, 'Invalid MBBS year (must be 1–5).');
        targetYear = y;
    }
    let scopeObj = p.scope;
    if (typeof scopeObj === 'string') {
        try { scopeObj = JSON.parse(scopeObj); } catch { scopeObj = {}; }
    }
    if (!scopeObj || typeof scopeObj !== 'object') scopeObj = {};
    if (targetYear !== null) {
        scopeObj.years = [targetYear];
    }
    const scope = scopeValidate(scopeObj);
    const pid = p.id || id();
    await database().batch([upsert('packages', { id: pid }, { id: pid, name: p.name.trim(), description: String(p.description || ''), price: p.price, days: p.days, year: targetYear, scope: JSON.stringify(scope), active: p.active ? 1 : 0 }), auditStatement(u.id, 'package_saved', pid)]);
    return json({ message: 'Package saved.' });
} if (action === 'accounts') {
    if (req.method === 'GET') {
        const row = await one('settings', { "key": "payment_accounts" }, { projection: { _id: 0, value: 1 } });
        const d = row ? JSON.parse(row.value) : {};
        return json(['JazzCash', 'Easypaisa', 'NayaPay'].map(name => ({ name, ...d[name], enabled: !!d[name]?.enabled && !!d[name]?.title && !!d[name]?.number })));
    }
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    check(['JazzCash', 'Easypaisa', 'NayaPay'].includes(p.name), 'Unknown payment method.');
    check(!p.enabled || (p.title && p.number), 'Account title and number are required.');
    check(!p.qr || /^https:\/\//.test(p.qr), 'QR image must be an HTTPS URL.');
    const old = await one('settings', { "key": "payment_accounts" }, { projection: { _id: 0, value: 1 } });
    const settings = old ? JSON.parse(old.value) : {};
    settings[p.name] = { title: String(p.title || ''), number: String(p.number || ''), instructions: String(p.instructions || ''), qr: p.qr || '', enabled: !!p.enabled };
    await database().batch([upsert('settings', { key: "payment_accounts" }, { key: "payment_accounts", value: JSON.stringify(settings) }), auditStatement(u.id, 'payment_account_saved', p.name)]);
    return json({ message: 'Payment instructions saved.' });
} check(false, 'Route not found', 404); }
