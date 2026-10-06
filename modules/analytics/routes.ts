import { status } from '../access/service';
import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { json, check } from '../../lib/server/http';
export async function handle(action: string, req: Request) { const u = await requireUser(req); check(u.role === 'student', 'This workflow is for student accounts.', 403); check(action === 'dashboard', 'Route not found', 404); const profile = await one('profiles', { "user_id": u.id }, { projection: { _id: 0, college: 1, year: 1 } }); const attempts = await rows('attempts', { "user_id": u.id }, { sort: { created: -1 } }); let answered = 0, correct = 0, completed = 0; const subjects: any = {}, modules: any = {}, topics: any = {}; for (const a of attempts) {
    if (a.finished)
        completed++;
    if (a.mode !== 'practice' && !a.finished)
        continue;
    const answers = JSON.parse(a.answers);
    for (const q of JSON.parse(a.items)) {
        const answer = answers[q.id];
        if (!answer)
            continue;
        answered++;
        const good = answer.choice === q.correct;
        if (good)
            correct++;
        for (const [record, key] of [[subjects, q.subject], [modules, q.module], [topics, q.topic]]) {
            record[key] ||= { answered: 0, correct: 0, incorrect: 0 };
            record[key].answered++;
            record[key][good ? 'correct' : 'incorrect']++;
        }
    }
} const bookmarked = await count('bookmarks', { "user_id": u.id }); const branding = await one('settings', { "key": "branding" }, { projection: { _id: 0, value: 1 } }); return json({ profile, branding: branding ? JSON.parse(branding.value) : { name: 'MedPrep', suffix: 'BCQs' }, access: await status(u.id), stats: { answered, correct, accuracy: answered ? Math.round(correct / answered * 10000) / 100 : 0, completed, bookmarks: bookmarked.count, subjects, modules, topics }, recent: attempts.slice(0, 5).map(({ id, mode, title, created, finished, result }) => ({ id, mode, title, created, finished, result: result ? JSON.parse(result) : null })) }); }
