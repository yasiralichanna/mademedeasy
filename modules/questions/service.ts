import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { digest } from '../../lib/server/crypto';
import { id } from '../../lib/server/http';

export async function categoryStatements(p: any) {
  const statements = [];
  let parent: string | null = null;
  let path = '' + p.year;
  for (const [kind, name] of [['year', 'Year ' + p.year], ['subject', p.subject], ['module', p.module], ['topic', p.topic]]) {
    path += '/' + name;
    const cid = await digest(path);
    statements.push(insert('categories', { id: cid, parent: parent, kind: kind, name: name, year: p.year }, true));
    parent = cid;
  }
  return statements;
}

export async function questionStatements(p: any, qid = id()) {
  return [
    ...await categoryStatements(p),
    upsert('questions', { id: qid }, {
      id: qid,
      stem: p.stem,
      options: JSON.stringify(p.options),
      correct: p.correct,
      explanation: p.explanation,
      incorrect: JSON.stringify(p.incorrect || {}),
      image: p.image,
      subject: p.subject,
      module: p.module,
      topic: p.topic,
      year: p.year,
      difficulty: p.difficulty,
      tags: JSON.stringify(p.tags || []),
      source: p.source,
      status: p.status,
      exam_type: 'practice'
    })
  ];
}

export function decodeQuestion(q: any) {
  const safeJson = (val: any, fallback: any) => {
    if (typeof val !== 'string') return val ?? fallback;
    try { return JSON.parse(val); } catch { return fallback; }
  };
  return {
    ...q,
    options: safeJson(q.options, []),
    incorrect: safeJson(q.incorrect, {}),
    tags: safeJson(q.tags, []),
    exam_type: 'practice'
  };
}
