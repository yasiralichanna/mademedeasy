import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { check, now } from '../../lib/server/http';
import { guard } from '../access/service';
export function score(items: any[], answers: any) { const summary: any = { correct: 0, incorrect: 0, unanswered: 0, total: items.length, percentage: 0, subjects: {} as any, modules: {} as any, topics: {} as any }; for (const q of items) {
    const a = answers[q.id];
    const state = !a ? 'unanswered' : a.choice === q.correct ? 'correct' : 'incorrect';
    summary[state]++;
    for (const [field, key] of [['subjects', q.subject], ['modules', q.module], ['topics', q.topic]]) {
        summary[field][key] ||= { correct: 0, incorrect: 0, unanswered: 0, total: 0 };
        summary[field][key][state]++;
        summary[field][key].total++;
    }
} summary.percentage = Math.round(summary.correct / items.length * 10000) / 100; return summary; }
export async function owned(user: any, attemptId: string) { const a = await one('attempts', { "id": attemptId, "user_id": user.id }); check(a, 'Session not found.', 404); await guard(user, JSON.parse(a.items)); return a; }
export async function finalize(a: any) { if (a.finished)
    return a; for (let i = 0; i < 4; i++) {
    const result = score(JSON.parse(a.items), JSON.parse(a.answers));
    const finished = Math.min(now(), a.deadline || now());
    const updated = await update('attempts', { "id": a.id, "finished": null, "answers": a.answers }, { finished: finished, result: JSON.stringify(result) }).run();
    a = await one('attempts', { "id": a.id });
    if (a.finished)
        return a;
} check(false, 'Answers changed while submitting. Please try again.', 409); }
export function publicAttempt(a: any) { const items = JSON.parse(a.items), answers = JSON.parse(a.answers); return { ...a, items: items.map((q: any) => { const show = !!a.finished || (a.mode === 'practice' && answers[q.id]); const { correct, explanation, incorrect, source, ...safe } = q; return show ? { ...safe, correct, explanation, incorrect, source } : safe; }), answers, flags: JSON.parse(a.flags), result: a.result ? JSON.parse(a.result) : null }; }
export async function wrongIds(user: string) { const attempts = await rows('attempts',{user_id:user,$or:[{mode:'practice'},{finished:{$ne:null}}]}); const wrong = new Set<string>(); for (const a of attempts) {
    const answers = JSON.parse(a.answers);
    for (const q of JSON.parse(a.items))
        if (answers[q.id] && answers[q.id].choice !== q.correct)
            wrong.add(q.id);
} return wrong; }
