import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { digest } from '../../lib/server/crypto';
import { id } from '../../lib/server/http';
export async function categoryStatements(p: any) { const statements = []; let parent: string | null = null; let path = '' + p.year; for (const [kind, name] of [['year', 'Year ' + p.year], ['subject', p.subject], ['module', p.module], ['topic', p.topic]]) {
    path += '/' + name;
    const cid = await digest(path);
    statements.push(insert('categories', { id: cid, parent: parent, kind: kind, name: name, year: p.year }, true));
    parent = cid;
} return statements; }
export async function questionStatements(p: any, qid = id()) { return [...await categoryStatements(p), upsert('questions', { id: qid }, { id: qid, stem: p.stem, options: JSON.stringify(p.options), correct: p.correct, explanation: p.explanation, incorrect: JSON.stringify(p.incorrect), image: p.image, subject: p.subject, module: p.module, topic: p.topic, year: p.year, difficulty: p.difficulty, tags: JSON.stringify(p.tags), source: p.source, status: p.status, exam_type: p.exam_type || 'all' })]; }
export function decodeQuestion(q: any) { return { ...q, options: JSON.parse(q.options), incorrect: JSON.parse(q.incorrect), tags: JSON.parse(q.tags), exam_type: q.exam_type || 'all' }; }
