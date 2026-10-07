'use client';
import { useEffect, useState } from 'react';
import { Plus, Upload, FileDown, Search, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '../api';
import { Empty, Modal, Status } from '../../components/Common';

export default function Questions() {
  const [items, setItems] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [format, setFormat] = useState('json');
  const [preview, setPreview] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api('questions/admin')
      .then(setItems)
      .catch((e) => setMessage(e.message));

  useEffect(() => {
    load();
  }, []);

  async function save(e: any) {
    e.preventDefault();
    setBusy(true);
    try {
      const p: any = Object.fromEntries(new FormData(e.currentTarget));
      p.id = edit.id;
      p.options = [p.option0, p.option1, p.option2, p.option3, p.option4].filter(Boolean);
      p.correct = Number(p.correct);
      p.year = Number(p.year);
      p.exam_type = 'practice';
      try {
        p.incorrect = p.incorrect?.trim() ? JSON.parse(p.incorrect) : {};
      } catch {
        p.incorrect = {};
      }
      await api('questions/save', p);
      setEdit(null);
      load();
      setMessage('Practice BCQ saved successfully.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doImport(commit = false, skipInvalid = false) {
    setBusy(true);
    try {
      const d = await api('questions/import', {
        text,
        format,
        commit,
        skip_invalid: skipInvalid,
        default_exam_type: 'practice',
      });
      if (commit) {
        setImporting(false);
        setPreview(null);
        setText('');
        load();
        setMessage(d.message);
      } else {
        setPreview(d);
      }
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter(
    (q) =>
      (status === 'all' || q.status === status) &&
      (yearFilter === 'all' || String(q.year) === yearFilter) &&
      q.stem.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>
              Practice BCQs bank <span className="badge-count">{items.length}</span>
            </h3>
            <small style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
              Practice questions grouped by MBBS year and unlocked for students with matching package access.
            </small>
          </div>
          <div className="row">
            <button
              className="btn"
              onClick={() => {
                setImporting(true);
                setPreview(null);
              }}
            >
              <Upload size={15} /> Import BCQs
            </button>
            <button
              className="btn primary"
              onClick={() =>
                setEdit({
                  options: ['', '', '', ''],
                  correct: 0,
                  status: 'draft',
                  year: yearFilter !== 'all' ? Number(yearFilter) : 1,
                  exam_type: 'practice',
                  difficulty: 'medium',
                  tags: [],
                  incorrect: {},
                })
              }
            >
              <Plus size={15} /> New BCQ
            </button>
          </div>
        </div>

        <div className="filters">
          <input
            aria-label="Search question stems"
            placeholder="Search Practice BCQ stems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            aria-label="Filter by MBBS Year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All MBBS Years</option>
            <option value="1">Year 1 (1st Year Package)</option>
            <option value="2">Year 2 (2nd Year Package)</option>
            <option value="3">Year 3 (3rd Year Package)</option>
            <option value="4">Year 4 (4th Year Package)</option>
            <option value="5">Year 5 (5th Year Package)</option>
          </select>
          <select
            aria-label="Question status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['all', 'draft', 'published', 'archived'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table style={{ whiteSpace: 'normal' }}>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Academic path & Year</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id}>
                    <td style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 500 }}>{q.stem}</div>
                      <small style={{ display: 'block', color: 'var(--muted)', marginTop: 4 }}>
                        {q.difficulty} difficulty · {q.options?.length || 0} options
                      </small>
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <span className="pill" style={{ marginBottom: 4, display: 'inline-block' }}>
                        Year {q.year} MBBS
                      </span>
                      <div>
                        <strong>{q.subject}</strong>
                      </div>
                      <small style={{ display: 'block', color: 'var(--muted)' }}>
                        {q.module} / {q.topic}
                      </small>
                    </td>
                    <td>
                      <Status value={q.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn" onClick={() => setEdit(q)}>
                        Review / edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No matching Practice BCQs"
            text="Create questions or import up to 1,500 questions via CSV or JSON. Questions are organized by MBBS year packages."
          />
        )}
      </section>

      {edit && (
        <Modal
          title={edit.id ? 'Review Practice BCQ' : 'Create Practice BCQ'}
          close={() => setEdit(null)}
        >
          <form onSubmit={save}>
            <label>
              Question stem
              <textarea name="stem" defaultValue={edit.stem} required />
            </label>
            <div className="form-grid">
              {[0, 1, 2, 3, 4].map((i) => (
                <label key={i}>
                  Option {String.fromCharCode(65 + i)} {i === 4 ? '(optional)' : ''}
                  <input
                    name={'option' + i}
                    defaultValue={edit.options?.[i] || ''}
                    required={i < 4}
                  />
                </label>
              ))}
              <label>
                Best answer
                <select name="correct" defaultValue={edit.correct}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <option key={i} value={i}>
                      Option {String.fromCharCode(65 + i)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Explanation
              <textarea name="explanation" defaultValue={edit.explanation} required />
            </label>
            <label>
              Incorrect option explanations (optional JSON)
              <textarea
                name="incorrect"
                defaultValue={JSON.stringify(edit.incorrect || {})}
                placeholder={'{"0":"Why A is incorrect"}'}
              />
            </label>
            <div className="form-grid">
              <label>
                MBBS year (Package binding)
                <select name="year" defaultValue={edit.year}>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option value={y} key={y}>
                      Year {y} (1st–5th Year Package)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section
                <input
                  type="text"
                  value="Practice BCQs"
                  readOnly
                  disabled
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
                />
                <input type="hidden" name="exam_type" value="practice" />
              </label>
              <label>
                Subject
                <input name="subject" defaultValue={edit.subject} required />
              </label>
              <label>
                Module
                <input name="module" defaultValue={edit.module} required />
              </label>
              <label>
                Topic
                <input name="topic" defaultValue={edit.topic} required />
              </label>
              <label>
                Difficulty
                <select name="difficulty" defaultValue={edit.difficulty}>
                  {['easy', 'medium', 'hard'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status" defaultValue={edit.status}>
                  {['draft', 'published', 'archived'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Source / reference details
              <textarea name="source" defaultValue={edit.source} />
            </label>
            <label>
              Tags (separated by |)
              <input name="tags" defaultValue={edit.tags?.join('|') || ''} />
            </label>
            <label>
              Question image URL (optional)
              <input name="image" type="url" defaultValue={edit.image || ''} />
            </label>
            <div className="notice">
              Publishing makes this BCQ available in Practice mode for students enrolled in this MBBS Year package.
            </div>
            <button className="btn primary wide" disabled={busy}>
              {busy ? 'Saving…' : 'Save question'}
            </button>
          </form>
        </Modal>
      )}

      {importing && (
        <Modal title="Import Practice BCQs" close={() => setImporting(false)}>
          <div className="row" style={{ marginBottom: 16 }}>
            <a className="btn" href="/api/questions/template?format=csv">
              <FileDown size={15} /> Download CSV template
            </a>
            <a className="btn" href="/api/questions/template?format=json">
              <FileDown size={15} /> Download JSON template
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Format
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="csv">CSV (Spreadsheet / Excel / TSV)</option>
                <option value="json">JSON Array</option>
              </select>
            </label>
            <label>
              Target Section
              <input
                type="text"
                value="Practice BCQs"
                readOnly
                disabled
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
              />
            </label>
          </div>

          <label>
            Choose file (.csv, .tsv, or .json)
            <input
              type="file"
              accept=".csv,.json,.tsv,.txt"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
                    setFormat('csv');
                  } else if (file.name.endsWith('.json')) {
                    setFormat('json');
                  }
                  setText(await file.text());
                  setPreview(null);
                }
              }}
            />
          </label>

          <label>
            Or paste CSV / TSV / JSON content
            <textarea
              value={text}
              placeholder="Paste up to 1,500 questions here, or upload a CSV / JSON file above…"
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 13 }}
            />
          </label>

          <small style={{ color: 'var(--muted)', display: 'block', marginTop: -4, marginBottom: 12 }}>
            ⚡ Supports 1–1,500 questions at a time (up to 25 MB). All imported questions are saved as drafts in Practice BCQs.
          </small>

          {preview && (
            <div style={{ marginTop: 14, marginBottom: 14 }}>
              {/* Summary stat cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, textAlign: 'center' }}>
                  <small style={{ color: 'var(--muted)', display: 'block' }}>Total Rows</small>
                  <strong style={{ fontSize: 18 }}>{preview.total ?? preview.preview?.length ?? 0}</strong>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(34, 197, 94, 0.12)', borderRadius: 8, textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <small style={{ color: '#4ade80', display: 'block' }}>Valid Questions</small>
                  <strong style={{ fontSize: 18, color: '#4ade80' }}>{preview.valid}</strong>
                </div>
                <div style={{ padding: '10px 12px', background: preview.invalid > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.05)', borderRadius: 8, textAlign: 'center', border: preview.invalid > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none' }}>
                  <small style={{ color: preview.invalid > 0 ? '#f87171' : 'var(--muted)', display: 'block' }}>Errors</small>
                  <strong style={{ fontSize: 18, color: preview.invalid > 0 ? '#f87171' : 'inherit' }}>{preview.invalid}</strong>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: 8, textAlign: 'center' }}>
                  <small style={{ color: '#fbbf24', display: 'block' }}>Existing Duplicates</small>
                  <strong style={{ fontSize: 18, color: '#fbbf24' }}>{preview.duplicates ?? 0}</strong>
                </div>
              </div>

              {/* Error messages if any */}
              {preview.invalid > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <strong style={{ color: '#f87171', display: 'block', marginBottom: 6 }}>
                    ⚠️ {preview.invalid} question(s) have validation issues:
                  </strong>
                  <div style={{ maxHeight: 130, overflowY: 'auto', fontSize: 12, lineHeight: 1.6 }}>
                    {preview.preview.filter((r: any) => r.error).slice(0, 30).map((r: any) => (
                      <div key={r.row} style={{ color: '#fca5a5' }}>
                        • Row {r.row}: {r.error}
                      </div>
                    ))}
                    {preview.preview.filter((r: any) => r.error).length > 30 && (
                      <small style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                        ...and {preview.preview.filter((r: any) => r.error).length - 30} more errors.
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* Sample preview table of first 20 rows */}
              {preview.preview && preview.preview.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <small style={{ color: 'var(--muted)', fontWeight: 600 }}>
                      Previewing sample (Showing first {Math.min(preview.preview.length, 20)} of {preview.preview.length} questions):
                    </small>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', fontSize: 12 }}>
                    {preview.preview.slice(0, 20).map((r: any) => (
                      <div
                        key={r.row}
                        style={{
                          padding: '6px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          color: r.error ? '#f87171' : 'inherit',
                        }}
                      >
                        <strong>Row {r.row}:</strong>{' '}
                        {r.error ? (
                          <span style={{ color: '#fca5a5' }}>{r.error}</span>
                        ) : (
                          <span>
                            {r.question?.stem?.slice(0, 75)}{r.question?.stem?.length > 75 ? '…' : ''}{' '}
                            <span style={{ color: 'var(--muted)' }}>
                              [Year {r.question?.year} · {r.question?.subject} · {r.question?.options?.length} opts · Correct: {String.fromCharCode(65 + (r.question?.correct || 0))}]
                            </span>
                            {r.duplicate && <span style={{ color: '#fbbf24', marginLeft: 6 }}>⚠️ Stem exists in DB</span>}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: 18 }}>
            <button
              className="btn"
              disabled={busy || !text.trim()}
              onClick={() => doImport(false)}
            >
              {busy && !preview ? 'Validating…' : 'Validate & preview'}
            </button>

            {preview && preview.valid > 0 && (
              <>
                {preview.invalid === 0 ? (
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => doImport(true, false)}
                  >
                    {busy ? 'Importing…' : `Import all ${preview.valid} as drafts`}
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    disabled={busy}
                    title="Import questions that passed validation and skip rows with errors"
                    onClick={() => doImport(true, true)}
                  >
                    {busy ? 'Importing…' : `Import ${preview.valid} valid questions as drafts`}
                  </button>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
