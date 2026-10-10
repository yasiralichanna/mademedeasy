import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { guard, activeScopes, allowed } from '../access/service';
import { auditStatement, record } from '../admin/audit';
import { check, json, id, HttpError } from '../../lib/server/http';
import { digest } from '../../lib/server/crypto';
import { validateQuestion, parseCSV } from './validation';
import { categoryStatements, questionStatements, decodeQuestion } from './service';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function handle(action: string, req: Request) {
  if (action === 'demo') {
    const url = new URL(req.url);
    const yearParam = url.searchParams.get('year');
    const filter: any = { status: 'published' };
    if (yearParam && !isNaN(Number(yearParam))) {
      filter.year = Number(yearParam);
    }
    // Fix a pool of 30 published BCQs (excluding drafts, deterministic order)
    let fixed30 = await rows('questions', filter, { limit: 30, sort: { _id: 1 } });
    if (fixed30.length === 0 && filter.year) {
      fixed30 = await rows('questions', { status: 'published' }, { limit: 30, sort: { _id: 1 } });
    }
    // Randomly select 15 questions from the fixed 30 BCQs pool
    const selected15 = shuffle(fixed30).slice(0, 15);
    return json(selected15.map(decodeQuestion));
  }

  const u = await requireUser(req, ['admin', 'save', 'import', 'categories', 'publish'].includes(action));

  if (action === 'catalog') {
    await guard(u);
    const scopes = u.role === 'admin' ? null : await activeScopes(u.id);
    const enrolledYear = u.year ? Number(u.year) : (u.role === 'student' ? (await one('profiles', { user_id: u.id }))?.year : null);
    const matchFilter: any = { status: 'published' };
    matchFilter.$or = [{ exam_type: 'practice' }, { exam_type: 'all' }, { exam_type: null }, { exam_type: { $exists: false } }];
    const qs = (await (await (await collection('questions')).aggregate([
      { $match: matchFilter },
      { $group: { _id: { year: '$year', subject: '$subject', module: '$module', topic: '$topic' }, count: { $sum: 1 } } },
      { $project: { _id: 0, year: '$_id.year', subject: '$_id.subject', module: '$_id.module', topic: '$_id.topic', count: 1 } }
    ]).toArray())).filter(q => {
      if (enrolledYear && q.year !== enrolledYear) return false;
      return !scopes || scopes.some(s => allowed(s.scope, q));
    });
    return json(qs);
  }

  if (action === 'admin') {
    return json((await rows('questions', {}, { sort: { _id: -1 } })).map(decodeQuestion));
  }

  if (action === 'categories') {
    if (req.method === 'GET') {
      return json(await rows('categories', {}, { sort: { year: 1, kind: 1, name: 1 } }));
    }
    const p: any = await req.json();
    for (const field of ['id', 'user_id', 'question_id', 'email', 'token']) {
      if (p[field] !== undefined) check(typeof p[field] === 'string', 'Invalid ' + field + '.');
    }
    check(Number.isInteger(Number(p.year)) && Number(p.year) >= 1 && Number(p.year) <= 5, 'Select MBBS year.');
    for (const k of ['subject', 'module', 'topic']) {
      check(typeof p[k] === 'string' && p[k].trim().length >= 2, 'Enter ' + k);
    }
    await database().batch([...await categoryStatements({ ...p, year: Number(p.year) }), auditStatement(u.id, 'category_path_saved', p.topic)]);
    return json({ message: 'Academic path saved.' });
  }

  if (action === 'save') {
    const p: any = await req.json();
    for (const field of ['id', 'user_id', 'question_id', 'email', 'token']) {
      if (p[field] !== undefined) check(typeof p[field] === 'string', 'Invalid ' + field + '.');
    }
    const q = validateQuestion(p);
    if (p.id) {
      check(await one('questions', { "id": p.id }, { projection: { _id: 0, id: 1 } }), 'Question not found', 404);
    }
    await database().batch([...await questionStatements(q, p.id || id()), auditStatement(u.id, 'question_saved', p.id || q.stem.slice(0, 50), q.status)]);
    return json({ message: 'Question saved.' });
  }

  if (action === 'import') {
    const p: any = await req.json();
    for (const field of ['id', 'user_id', 'question_id', 'email', 'token']) {
      if (p[field] !== undefined) check(typeof p[field] === 'string', 'Invalid ' + field + '.');
    }
    check(typeof p.text === 'string' && p.text.trim().length > 0, 'Import content is empty.');
    check(p.text.length <= 25000000, 'Import file must be under 25 MB.');

    const trimmed = p.text.trim();
    let input: any[];
    const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
    if (p.format === 'json' || (looksLikeJson && p.format !== 'csv')) {
      try {
        const parsed = JSON.parse(trimmed);
        input = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || parsed.items || []);
      } catch (err: any) {
        if (p.format === 'csv') {
          input = parseCSV(trimmed);
        } else {
          throw new HttpError(400, 'Invalid JSON format: ' + err.message);
        }
      }
    } else {
      input = parseCSV(trimmed);
    }

    check(Array.isArray(input) && input.length > 0, 'No questions found in import content.');
    check(input.length <= 1500, 'Import up to 1,500 questions at a time.');

    const existing = await rows('questions', {}, { projection: { _id: 0, stem: 1 } });
    const seen = new Set(existing.map(q => q.stem?.trim().toLowerCase()).filter(Boolean));

    const preview = input.map((raw, i) => {
      try {
        const valid = validateQuestion({ ...raw, exam_type: 'practice', status: 'draft' });
        const duplicate = seen.has(valid.stem.toLowerCase());
        seen.add(valid.stem.toLowerCase());
        return { row: i + 1, question: valid, duplicate, error: null };
      } catch (e: any) {
        return { row: i + 1, question: null, duplicate: false, error: e.message || 'Validation error' };
      }
    });

    const validCount = preview.filter(r => !r.error).length;
    const invalidCount = preview.filter(r => r.error).length;
    const duplicateCount = preview.filter(r => r.duplicate).length;

    if (!p.commit) {
      return json({
        preview,
        valid: validCount,
        invalid: invalidCount,
        duplicates: duplicateCount,
        total: preview.length,
      });
    }

    const rowsToImport = p.skip_invalid
      ? preview.filter(r => !r.error && r.question).map(r => r.question!)
      : (() => {
          check(invalidCount === 0, `Please correct all ${invalidCount} validation error(s) before importing.`);
          return preview.map(r => r.question!);
        })();

    check(rowsToImport.length > 0, 'No valid questions to import.');

    // 1. Deduplicate and upsert categories
    const catMap = new Map<string, any>();
    for (const q of rowsToImport) {
      let parent: string | null = null;
      let path = '' + q.year;
      const kinds = [
        ['year', 'Year ' + q.year],
        ['subject', q.subject],
        ['module', q.module],
        ['topic', q.topic],
      ] as const;
      for (const [kind, name] of kinds) {
        path += '/' + name;
        const cid = await digest(path);
        if (!catMap.has(cid)) {
          catMap.set(cid, {
            id: cid,
            parent,
            kind,
            name,
            year: q.year,
          });
        }
        parent = cid;
      }
    }

    if (catMap.size > 0) {
      const catOps = Array.from(catMap.values()).map(cat => ({
        updateOne: {
          filter: { id: cat.id },
          update: { $setOnInsert: cat },
          upsert: true,
        },
      }));
      const catCol = await collection('categories');
      await catCol.bulkWrite(catOps, { ordered: false });
    }

    // 2. Bulk insert/upsert questions in chunks of 500
    const questionDocs = rowsToImport.map(q => {
      const qid = (q as any).id || id();
      return {
        id: qid,
        stem: q.stem,
        options: JSON.stringify(q.options),
        correct: q.correct,
        explanation: q.explanation,
        incorrect: JSON.stringify(q.incorrect || {}),
        image: q.image || null,
        subject: q.subject,
        module: q.module,
        topic: q.topic,
        year: q.year,
        difficulty: q.difficulty,
        tags: JSON.stringify(q.tags || []),
        source: q.source || '',
        status: p.publish_immediately ? 'published' : 'draft',
        exam_type: 'practice',
      };
    });

    const qCol = await collection('questions');
    const CHUNK_SIZE = 500;
    for (let i = 0; i < questionDocs.length; i += CHUNK_SIZE) {
      const chunk = questionDocs.slice(i, i + CHUNK_SIZE);
      const qOps = chunk.map(doc => ({
        updateOne: {
          filter: { id: doc.id },
          update: { $set: doc },
          upsert: true,
        },
      }));
      await qCol.bulkWrite(qOps, { ordered: false });
    }

    // 3. Audit log
    const statusLabel = p.publish_immediately ? 'Published' : 'Drafts';
    await record(u.id, 'questions_imported', String(rowsToImport.length), `Imported as Practice BCQs (${statusLabel})`);

    return json({
      message: `${rowsToImport.length} questions successfully imported as Practice BCQs (${statusLabel}).`,
      imported: rowsToImport.length,
    });
  }

  if (action === 'publish') {
    const p: any = await req.json();
    for (const field of ['id', 'user_id', 'question_id', 'email', 'token']) {
      if (p[field] !== undefined) check(typeof p[field] === 'string', 'Invalid ' + field + '.');
    }
    const qCol = await collection('questions');

    if (Array.isArray(p.ids) && p.ids.length > 0) {
      check(p.ids.length <= 5000, 'Too many questions to publish at once.');
      const res = await qCol.updateMany(
        { id: { $in: p.ids }, status: 'draft' },
        { $set: { status: 'published', exam_type: 'practice' } }
      );
      await record(u.id, 'questions_published', String(res.modifiedCount), `Published ${res.modifiedCount} questions from draft`);
      return json({
        message: `${res.modifiedCount} question${res.modifiedCount === 1 ? '' : 's'} published successfully.`,
        count: res.modifiedCount
      });
    }

    if (p.all_drafts) {
      const filter: any = { status: 'draft' };
      if (p.year && Number(p.year) >= 1 && Number(p.year) <= 5) {
        filter.year = Number(p.year);
      }
      const res = await qCol.updateMany(
        filter,
        { $set: { status: 'published', exam_type: 'practice' } }
      );
      await record(u.id, 'questions_published', String(res.modifiedCount), `Bulk published all ${res.modifiedCount} draft questions`);
      return json({
        message: `All ${res.modifiedCount} draft question${res.modifiedCount === 1 ? '' : 's'} published successfully.`,
        count: res.modifiedCount
      });
    }

    check(false, 'Select questions or choose all drafts to publish.');
  }

  if (action === 'template') {
    const csv = new URL(req.url).searchParams.get('format') === 'csv';
    if (csv) {
      const headers = ['stem', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct', 'explanation', 'subject', 'module', 'topic', 'year', 'difficulty', 'tags', 'source'];
      const demoRow = [
        'Which cranial nerve innervates the lateral rectus muscle of the eye?',
        'Oculomotor nerve (CN III)',
        'Trochlear nerve (CN IV)',
        'Abducens nerve (CN VI)',
        'Facial nerve (CN VII)',
        '',
        'C',
        'The lateral rectus muscle is solely innervated by the abducens nerve (CN VI). The formula LR6SO4EE3 helps remember eye muscle innervation.',
        'Anatomy',
        'Head & Neck',
        'Orbit & Eye',
        '1',
        'medium',
        'anatomy|cranial_nerves|orbit',
        'Gray\'s Anatomy for Students'
      ];
      const text = headers.join(',') + '\n' + demoRow.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',') + '\n';
      return new Response(text, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="practice-bcqs-template.csv"'
        }
      });
    } else {
      const demo = [
        {
          stem: 'Which cranial nerve innervates the lateral rectus muscle of the eye?',
          options: [
            'Oculomotor nerve (CN III)',
            'Trochlear nerve (CN IV)',
            'Abducens nerve (CN VI)',
            'Facial nerve (CN VII)'
          ],
          correct: 2,
          explanation: 'The lateral rectus muscle is solely innervated by the abducens nerve (CN VI). The formula LR6SO4EE3 helps remember eye muscle innervation.',
          subject: 'Anatomy',
          module: 'Head & Neck',
          topic: 'Orbit & Eye',
          year: 1,
          difficulty: 'medium',
          tags: ['anatomy', 'cranial_nerves', 'orbit'],
          source: 'Gray\'s Anatomy for Students',
          exam_type: 'practice',
          status: 'draft'
        }
      ];
      return new Response(JSON.stringify(demo, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="practice-bcqs-template.json"'
        }
      });
    }
  }

  check(false, 'Route not found', 404);
}
