import { check } from '../../lib/server/http';
export function validateQuestion(p: any) { check(p && typeof p === 'object', 'Question must be an object.'); check(typeof p.stem === 'string' && p.stem.trim().length >= 5 && p.stem.length <= 10000, 'Question stem must be 5–10000 characters.'); const options = typeof p.options === 'string' ? JSON.parse(p.options) : p.options; check(Array.isArray(options) && [4, 5].includes(options.length) && options.every(v => typeof v === 'string' && v.trim()), 'Provide four or five nonempty options.'); check(new Set(options.map(v => v.trim().toLowerCase())).size === options.length, 'Options must be distinct.'); const correct = Number(p.correct); check(Number.isInteger(correct) && correct >= 0 && correct < options.length, 'Choose exactly one best answer (zero-based index).'); check(typeof p.explanation === 'string' && p.explanation.trim().length >= 3, 'An explanation is required.'); for (const key of ['subject', 'module', 'topic'])
    check(typeof p[key] === 'string' && p[key].trim().length >= 2 && p[key].length <= 150, `A valid ${key} is required.`); check(Number.isInteger(Number(p.year)) && Number(p.year) >= 1 && Number(p.year) <= 5, 'MBBS year must be 1–5.'); check(['easy', 'medium', 'hard'].includes(p.difficulty), 'Choose easy, medium or hard difficulty.'); const tags = typeof p.tags === 'string' ? p.tags.startsWith('[') ? JSON.parse(p.tags) : p.tags.split('|').filter(Boolean) : p.tags || []; check(Array.isArray(tags) && tags.every(t => typeof t === 'string'), 'Tags must be strings.'); const incorrect = typeof p.incorrect === 'string' ? JSON.parse(p.incorrect) : p.incorrect || {}; check(incorrect && typeof incorrect === 'object' && !Array.isArray(incorrect) && Object.values(incorrect).every(v => typeof v === 'string'), 'Incorrect explanations must be an object of option indexes to strings.'); check(!p.image || /^https:\/\//.test(p.image), 'Question image must be an HTTPS URL.'); check(['draft', 'published', 'archived'].includes(p.status || 'draft'), 'Invalid publication status.'); return { stem: p.stem.trim(), options, correct, explanation: p.explanation.trim(), incorrect, image: p.image || null, year: Number(p.year), subject: p.subject.trim(), module: p.module.trim(), topic: p.topic.trim(), difficulty: p.difficulty, tags, source: String(p.source || ''), status: p.status || 'draft', exam_type: ['practice', 'module', 'final', 'all'].includes(p.exam_type) ? p.exam_type : (['practice', 'module', 'final', 'all'].includes(p.section) ? p.section : 'all') }; }
export function parseCSV(text: string) { const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false; for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
        if (quoted && text[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else
            quoted = !quoted;
    }
    else if (c === ',' && !quoted) {
        row.push(cell);
        cell = '';
    }
    else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n')
            i++;
        row.push(cell);
        if (row.some(x => x.trim()))
            rows.push(row);
        row = [];
        cell = '';
    }
    else
        cell += c;
} check(!quoted, 'CSV has an unclosed quoted field.'); row.push(cell); if (row.some(x => x.trim()))
    rows.push(row); const headers = rows.shift()?.map(v => v.replace(/^\uFEFF/, '').trim()); check(headers?.length, 'CSV headers are missing.'); return rows.map(r => Object.fromEntries(headers!.map((h, i) => [h, r[i] || '']))); }
