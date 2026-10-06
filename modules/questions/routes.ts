import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { guard, activeScopes, allowed } from '../access/service';
import { auditStatement } from '../admin/audit';
import { check, json, id } from '../../lib/server/http';
import { validateQuestion, parseCSV } from './validation';
import { categoryStatements, questionStatements, decodeQuestion } from './service';
export async function handle(action: string, req: Request) { const u = await requireUser(req, ['admin', 'save', 'import', 'categories'].includes(action)); if (action === 'catalog') {
    await guard(u);
    const scopes = u.role === 'admin' ? null : await activeScopes(u.id);
    const enrolledYear = u.year ? Number(u.year) : (u.role === 'student' ? (await one('profiles', { user_id: u.id }))?.year : null);
    const mode = new URL(req.url).searchParams.get('mode');
    const matchFilter: any = { status: 'published' };
    if (mode && ['practice', 'module', 'final'].includes(mode)) {
        matchFilter.$or = [{ exam_type: mode }, { exam_type: 'all' }, { exam_type: null }, { exam_type: { $exists: false } }];
    }
    const qs = (await (await (await collection('questions')).aggregate([{$match:matchFilter},{$group:{_id:{year:'$year',subject:'$subject',module:'$module',topic:'$topic'},count:{$sum:1}}},{$project:{_id:0,year:'$_id.year',subject:'$_id.subject',module:'$_id.module',topic:'$_id.topic',count:1}}]).toArray())).filter(q => {
        if (enrolledYear && q.year !== enrolledYear) return false;
        return !scopes || scopes.some(s => allowed(s.scope, q));
    });
    return json(qs);
} if (action === 'admin')
    return json((await rows('questions', {}, { sort: { _id: -1 } })).map(decodeQuestion)); if (action === 'categories') {
    if (req.method === 'GET')
        return json(await rows('categories', {}, { sort: { year: 1, kind: 1, name: 1 } }));
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    check(Number.isInteger(Number(p.year)) && Number(p.year) >= 1 && Number(p.year) <= 5, 'Select MBBS year.');
    for (const k of ['subject', 'module', 'topic'])
        check(typeof p[k] === 'string' && p[k].trim().length >= 2, 'Enter ' + k);
    await database().batch([...await categoryStatements({ ...p, year: Number(p.year) }), auditStatement(u.id, 'category_path_saved', p.topic)]);
    return json({ message: 'Academic path saved.' });
} if (action === 'save') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const q = validateQuestion(p);
    if (p.id)
        check(await one('questions', { "id": p.id }, { projection: { _id: 0, id: 1 } }), 'Question not found', 404);
    await database().batch([...await questionStatements(q, p.id || id()), auditStatement(u.id, 'question_saved', p.id || q.stem.slice(0, 50), q.status)]);
    return json({ message: 'Question saved.' });
} if (action === 'import') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    check(typeof p.text === 'string' && p.text.length <= 1000000, 'Import must be under 1 MB.');
    const input = p.format === 'csv' ? parseCSV(p.text) : JSON.parse(p.text);
    check(Array.isArray(input) && input.length > 0 && input.length <= 200, 'Import 1–200 questions at a time.');
    const existing = await rows('questions', {}, { projection: { _id: 0, stem: 1 } });
    const seen = new Set(existing.map(q => q.stem.trim().toLowerCase()));
    const preview = input.map((q, i) => { try {
        const valid = validateQuestion({ ...q, exam_type: q.exam_type || q.section || p.default_exam_type || 'all', status: 'draft' });
        const duplicate = seen.has(valid.stem.toLowerCase());
        seen.add(valid.stem.toLowerCase());
        return { row: i + 1, question: valid, duplicate, error: null };
    }
    catch (e: any) {
        return { row: i + 1, question: null, duplicate: false, error: e.message };
    } });
    if (!p.commit)
        return json({ preview, valid: preview.filter(r => !r.error).length, invalid: preview.filter(r => r.error).length });
    check(preview.every(r => !r.error), 'Correct all validation errors before importing.');
    const batches = [];
    for (const row of preview)
        batches.push(...await questionStatements(row.question));
    check(batches.length <= 1000, 'Import is too large.');
    await database().batch([...batches, auditStatement(u.id, 'questions_imported', String(input.length), 'All drafts')]);
    return json({ message: input.length + ' questions imported as drafts.' });
} if (action === 'template') {
    const csv = new URL(req.url).searchParams.get('format') === 'csv';
    const demo = { stem: 'DEMONSTRATION ONLY: Which option is labeled B?', options: ['A', 'B', 'C', 'D'], correct: 1, explanation: 'This nonmedical demonstration checks the interface.', incorrect: {}, year: 1, subject: 'Demonstration', module: 'Interface checks', topic: 'Sample questions', difficulty: 'easy', exam_type: 'practice', tags: ['demo'], source: 'Development demonstration — not medical content', status: 'draft' };
    const text = csv ? Object.keys(demo).join(',') + '\n' + Object.values(demo).map(v => '"' + (typeof v === 'object' ? JSON.stringify(v) : String(v)).replaceAll('"', '""') + '"').join(',') + '\n' : JSON.stringify([demo], null, 2);
    return new Response(text, { headers: { 'Content-Type': csv ? 'text/csv' : 'application/json', 'Content-Disposition': 'attachment; filename="bcq-template.' + (csv ? 'csv' : 'json') + '"' } });
} check(false, 'Route not found', 404); }
