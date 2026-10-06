import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { guard, activeScopes, allowed } from '../access/service';
import { decodeQuestion } from '../questions/service';
import { owned, finalize, publicAttempt, wrongIds } from './service';
import { check, json, id, now } from '../../lib/server/http';
function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
} return a; }
export async function handle(action: string, req: Request) { const u = await requireUser(req); check(u.role === 'student', 'This workflow is for student accounts.', 403); if (action === 'list')
    return json(await rows('attempts', { "user_id": u.id }, { sort: { created: -1 }, projection: { _id: 0, id: 1, mode: 1, title: 1, created: 1, deadline: 1, finished: 1, result: 1 } })); await guard(u); if (action === 'revision') {
    const which = new URL(req.url).searchParams.get('mode');
    const prof = u.year ? { year: u.year } : await one('profiles', { user_id: u.id });
    const enrolledYear = prof?.year ? Number(prof.year) : null;
    let qs = await rows('questions',{status:'published'});
    const ids = which === 'bookmarks' ? new Set((await rows('bookmarks', { "user_id": u.id }, { projection: { _id: 0, question_id: 1 } })).map(v => v.question_id)) : await wrongIds(u.id);
    const scopes = u.role === 'admin' ? null : await activeScopes(u.id);
    return json(qs.filter(q => (!enrolledYear || q.year === enrolledYear) && ids.has(q.id) && (!scopes || scopes.some(s => allowed(s.scope, q)))).map(q => ({ id: q.id, stem: q.stem, subject: q.subject, module: q.module, topic: q.topic, year: q.year })));
} if (action === 'bookmark') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const q = await one('questions', { "id": p.question_id, "status": "published" });
    check(q, 'Question not found.', 404);
    await guard(u, q);
    if (p.saved)
        await insert('bookmarks', { id: id(), user_id: u.id, question_id: q.id }, true).run();
    else
        await remove('bookmarks', { "user_id": u.id, "question_id": q.id }).run();
    return json({ message: p.saved ? 'Question bookmarked.' : 'Bookmark removed.' });
} if (action === 'start') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    check(['practice', 'module', 'final'].includes(p.mode), 'Invalid study mode.');
    const count = Number(p.count);
    check(Number.isInteger(count) && count >= 1 && count <= 100, 'Choose 1–100 questions.');
    const prof = u.year ? { year: u.year } : await one('profiles', { user_id: u.id });
    const enrolledYear = prof?.year ? Number(prof.year) : null;
    const targetYear = enrolledYear || Number(p.year);
    check(Number.isInteger(targetYear) && targetYear >= 1 && targetYear <= 5, 'Select MBBS year.');
    check(p.mode !== 'module' || p.module, 'Select a module.');
    const minutes = Number(p.minutes);
    check(p.mode === 'practice' || (Number.isInteger(minutes) && minutes >= 1 && minutes <= 240), 'Choose an exam duration of 1–240 minutes.');
    let qs = (await rows('questions', { "status": "published", "year": targetYear })).map(decodeQuestion);
    const scopes = u.role === 'admin' ? null : await activeScopes(u.id);
    qs = qs.filter(q => (!scopes || scopes.some(s => allowed(s.scope, q))) && (!p.subject || q.subject === p.subject) && (!p.module || q.module === p.module) && (!p.topic || q.topic === p.topic) && ((q.exam_type || 'all') === 'all' || (q.exam_type || 'all') === p.mode));
    if (p.revision) {
        const ids = p.revision === 'bookmarks' ? new Set((await rows('bookmarks', { "user_id": u.id }, { projection: { _id: 0, question_id: 1 } })).map(v => v.question_id)) : await wrongIds(u.id);
        qs = qs.filter(q => ids.has(q.id));
    }
    let selected: any[] = [];
    if (p.mode === 'final' && p.distribution && Object.keys(p.distribution).length) {
        check(typeof p.distribution === 'object' && !Array.isArray(p.distribution), 'Distribution must be a subject-to-count object.');
        check(Object.values(p.distribution).every(v => Number.isInteger(v) && Number(v) >= 0) && Object.values(p.distribution).reduce((a: any, b: any) => a + b, 0) === count, 'Subject distribution must add up to the question count.');
        for (const [subject, n] of Object.entries(p.distribution)) {
            const pool = qs.filter(q => q.subject === subject);
            check(pool.length >= Number(n), `Only ${pool.length} questions available in ${subject}.`, 409);
            selected.push(...shuffle(pool).slice(0, Number(n)));
        }
    }
    else {
        check(qs.length >= count, `Only ${qs.length} matching published questions are available. Choose a smaller count or different filters.`, 409);
        selected = shuffle(qs).slice(0, count);
    }
    shuffle(selected);
    const aid = id(), created = now(), deadline = p.mode === 'practice' ? null : created + minutes * 60000;
    const title = p.mode === 'practice' ? (p.revision === 'bookmarks' ? 'Bookmark revision' : p.revision ? 'Mistake revision' : 'Practice') + (p.module ? ' · ' + p.module : '') : p.mode === 'module' ? 'Module exam · ' + p.module : 'Final examination · Year ' + targetYear;
    await insert('attempts', { id: aid, user_id: u.id, mode: p.mode, title: title, items: JSON.stringify(selected), answers: '{}', flags: '[]', created: created, deadline: deadline }).run();
    return json({ id: aid }, 201);
} if (action === 'get') {
    const aid = new URL(req.url).searchParams.get('id') || '';
    let a = await owned(u, aid);
    if (!a.finished && a.deadline && a.deadline <= now())
        a = await finalize(a);
    return json(publicAttempt(a));
} if (action === 'answer') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    let a = await owned(u, p.id);
    check(!a.finished, 'This session has already been submitted.', 409);
    if (a.deadline && a.deadline <= now()) {
        await finalize(a);
        check(false, 'Exam time has expired. Your saved answers were submitted.', 409);
    }
    const q = JSON.parse(a.items).find((q: any) => q.id === p.question_id);
    check(q, 'Question is not part of this session.');
    check(Number.isInteger(p.choice) && p.choice >= 0 && p.choice < q.options.length, 'Choose a valid answer option.');
    const answers=JSON.parse(a.answers);
    if(a.mode==='practice') check(!answers[q.id],'This practice answer has already been submitted.',409);
    answers[q.id]={choice:p.choice,at:now()};
    const changed=await update('attempts',{id:a.id,finished:null,answers:a.answers,$or:[{deadline:null},{deadline:{$gt:now()}}]},{answers:JSON.stringify(answers)}).run();
    check(changed.meta.changes===1,'Your session changed. Refresh and try again.',409);
    a = await one('attempts', { "id": a.id });
    return json(publicAttempt(a));
} if (action === 'flags') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const a = await owned(u, p.id);
    check(!a.finished, 'This session is finalized.', 409);
    check(!a.deadline || a.deadline > now(), 'Exam time has expired.', 409);
    check(Array.isArray(p.flags) && p.flags.every((v: any) => JSON.parse(a.items).some((q: any) => q.id === v)), 'Invalid flagged questions.');
    const changed=await update('attempts',{id:a.id,finished:null,$or:[{deadline:null},{deadline:{$gt:now()}}]},{flags:JSON.stringify([...new Set(p.flags)])}).run(); check(changed.meta.changes===1,'Session finalized or expired.',409);
    return json({ message: 'Review flags saved.' });
} if (action === 'finish') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    return json(publicAttempt(await finalize(await owned(u, p.id))));
} check(false, 'Route not found', 404); }
