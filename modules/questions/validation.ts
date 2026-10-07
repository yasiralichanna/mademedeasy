import { check } from '../../lib/server/http';

export function validateQuestion(p: any) {
  check(p && typeof p === 'object', 'Question must be an object.');

  // Normalize all keys: lowercase, remove non-alphanumeric except underscore
  const norm: Record<string, any> = {};
  for (const [k, v] of Object.entries(p)) {
    const cleanKey = k.toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
    norm[cleanKey] = v;
  }

  // 1. Question stem
  const stem = (norm.stem || norm.question || norm.question_stem || norm.text || norm.prompt || '').toString().trim();
  check(stem.length >= 5 && stem.length <= 10000, 'Question stem must be 5–10,000 characters.');

  // 2. Options
  let options: string[] = [];

  // Check explicit column variants for options A, B, C, D, E
  const colA = norm.option_a ?? norm.optiona ?? norm.opt_a ?? norm.opta ?? norm.a;
  const colB = norm.option_b ?? norm.optionb ?? norm.opt_b ?? norm.optb ?? norm.b;
  const colC = norm.option_c ?? norm.optionc ?? norm.opt_c ?? norm.optc ?? norm.c;
  const colD = norm.option_d ?? norm.optiond ?? norm.opt_d ?? norm.optd ?? norm.d;
  const colE = norm.option_e ?? norm.optione ?? norm.opt_e ?? norm.opte ?? norm.e;

  const explicitCols = [colA, colB, colC, colD, colE].filter(
    v => v !== undefined && v !== null && String(v).trim() !== ''
  );

  if (explicitCols.length >= 4) {
    options = explicitCols.map(v => String(v).trim());
  } else if (norm.options !== undefined && norm.options !== null) {
    if (Array.isArray(norm.options)) {
      options = norm.options.map((v: any) => String(v).trim()).filter(Boolean);
    } else if (typeof norm.options === 'string') {
      const optStr = norm.options.trim();
      if (optStr.startsWith('[') && optStr.endsWith(']')) {
        try {
          const parsed = JSON.parse(optStr);
          if (Array.isArray(parsed)) {
            options = parsed.map((v: any) => String(v).trim()).filter(Boolean);
          }
        } catch {
          // ignore JSON error and fall through
        }
      }
      if (options.length === 0) {
        if (optStr.includes('|')) {
          options = optStr.split('|').map(v => v.trim()).filter(Boolean);
        } else if (optStr.includes('\n')) {
          options = optStr.split('\n').map(v => v.trim()).filter(Boolean);
        } else if (optStr.includes(';')) {
          options = optStr.split(';').map(v => v.trim()).filter(Boolean);
        }
      }
    }
  } else {
    // Check numeric column variants: option 1, option 2, option 3, option 4
    const num1 = norm.option_1 ?? norm.option1 ?? norm.opt1;
    const num2 = norm.option_2 ?? norm.option2 ?? norm.opt2;
    const num3 = norm.option_3 ?? norm.option3 ?? norm.opt3;
    const num4 = norm.option_4 ?? norm.option4 ?? norm.opt4;
    const num5 = norm.option_5 ?? norm.option5 ?? norm.opt5;
    const numCols = [num1, num2, num3, num4, num5].filter(
      v => v !== undefined && v !== null && String(v).trim() !== ''
    );
    if (numCols.length >= 4) {
      options = numCols.map(v => String(v).trim());
    }
  }

  check(
    Array.isArray(options) && [4, 5].includes(options.length) && options.every(v => typeof v === 'string' && v.trim()),
    'Provide 4 or 5 nonempty options.'
  );
  check(
    new Set(options.map(v => v.trim().toLowerCase())).size === options.length,
    'Options must be distinct.'
  );

  // 3. Correct answer
  const rawCorrect = (norm.correct ?? norm.answer ?? norm.correct_answer ?? norm.best_answer ?? norm.key ?? '').toString().trim();
  let correct: number = -1;
  if (/^[a-eA-E]$/.test(rawCorrect)) {
    correct = rawCorrect.toUpperCase().charCodeAt(0) - 65; // A->0, B->1, etc.
  } else if (/^option\s*[a-eA-E]$/i.test(rawCorrect)) {
    correct = rawCorrect.slice(-1).toUpperCase().charCodeAt(0) - 65;
  } else if (/^\d+$/.test(rawCorrect)) {
    const num = parseInt(rawCorrect, 10);
    if (num >= 0 && num < options.length) {
      correct = num;
    } else if (num === options.length && num > 0) {
      correct = num - 1; // 1-based index (e.g. 4 for 4th option)
    }
  } else if (rawCorrect.length > 0) {
    const matchIdx = options.findIndex(o => o.toLowerCase() === rawCorrect.toLowerCase());
    if (matchIdx !== -1) correct = matchIdx;
  }
  check(
    Number.isInteger(correct) && correct >= 0 && correct < options.length,
    `Choose exactly one best answer (A, B, C, D or index 0-${options.length - 1}).`
  );

  // 4. Explanation
  let explanation = (norm.explanation || norm.rationale || norm.reason || norm.solution || '').toString().trim();
  if (!explanation) {
    explanation = 'Refer to standard medical curriculum reference materials for detailed discussion.';
  }
  check(explanation.length >= 3, 'An explanation of at least 3 characters is required.');

  // 5. Subject, Module, Topic
  const subject = (norm.subject || norm.course || 'General Medicine').toString().trim();
  const module = (norm.module || norm.unit || norm.system || 'Core Curriculum').toString().trim();
  const topic = (norm.topic || norm.chapter || norm.subtopic || 'High Yield BCQs').toString().trim();
  check(subject.length >= 2 && subject.length <= 150, 'A valid subject is required (2–150 chars).');
  check(module.length >= 2 && module.length <= 150, 'A valid module is required (2–150 chars).');
  check(topic.length >= 2 && topic.length <= 150, 'A valid topic is required (2–150 chars).');

  // 6. MBBS Year
  let year = parseInt(norm.year || norm.mbbs_year || '1', 10);
  if (!Number.isInteger(year) || year < 1 || year > 5) {
    year = 1;
  }

  // 7. Difficulty
  let difficulty = (norm.difficulty || 'medium').toString().toLowerCase().trim();
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    difficulty = 'medium';
  }

  // 8. Tags
  let tags: string[] = [];
  if (Array.isArray(norm.tags)) {
    tags = norm.tags.map(t => String(t).trim()).filter(Boolean);
  } else if (typeof norm.tags === 'string' && norm.tags.trim()) {
    const tStr = norm.tags.trim();
    if (tStr.startsWith('[') && tStr.endsWith(']')) {
      try {
        const parsed = JSON.parse(tStr);
        if (Array.isArray(parsed)) tags = parsed.map(t => String(t).trim()).filter(Boolean);
      } catch {
        tags = tStr.split(/[|,]/).map(t => t.trim()).filter(Boolean);
      }
    } else {
      tags = tStr.split(/[|,]/).map(t => t.trim()).filter(Boolean);
    }
  }

  // 9. Incorrect explanations
  let incorrect: Record<string, string> = {};
  if (norm.incorrect && typeof norm.incorrect === 'object' && !Array.isArray(norm.incorrect)) {
    incorrect = norm.incorrect;
  } else if (typeof norm.incorrect === 'string' && norm.incorrect.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(norm.incorrect);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        incorrect = parsed;
      }
    } catch {
      incorrect = {};
    }
  }

  // 10. Image
  let image = norm.image || norm.image_url || null;
  if (image && typeof image === 'string') {
    image = image.trim();
    if (!/^https?:\/\//.test(image)) image = null;
  } else {
    image = null;
  }

  // 11. Status & Exam Type (Always Practice BCQs)
  const status = ['draft', 'published', 'archived'].includes(norm.status) ? norm.status : 'draft';
  const source = String(norm.source || norm.reference || 'Admin Import');

  return {
    stem,
    options,
    correct,
    explanation,
    incorrect,
    image,
    year,
    subject,
    module,
    topic,
    difficulty,
    tags,
    source,
    status,
    exam_type: 'practice',
  };
}

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  // Detect delimiter: tab (\t) or comma (,)
  const firstLine = text.split(/[\r\n]+/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
      }
      row.push(cell);
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  check(!quoted, 'CSV has an unclosed quoted field. Please check your quotations.');
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);

  const rawHeaders = rows.shift();
  check(rawHeaders && rawHeaders.length > 0, 'CSV headers are missing.');
  const headers = rawHeaders.map(v => v.replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '').trim());

  return rows.map(r => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (r[i] ?? '').trim();
    }
    return obj;
  });
}
