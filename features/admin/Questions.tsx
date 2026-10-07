'use client';
import { useEffect, useState, useMemo } from 'react';
import { Plus, Upload, FileDown, Search, CheckCircle2, AlertTriangle, XCircle, Globe, CheckSquare, Square } from 'lucide-react';
import { api } from '../api';
import { Empty, Modal, Status } from '../../components/Common';

export default function Questions() {
  const [items, setItems] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [format, setFormat] = useState('csv');
  const [preview, setPreview] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Selection & Pagination states
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const load = () =>
    api('questions/admin')
      .then((data) => {
        setItems(data);
        setSelected(new Set());
      })
      .catch((e) => setMessage(e.message));

  useEffect(() => {
    load();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status, yearFilter]);

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

  async function doImport(commit = false, skipInvalid = false, publishImmediately = false) {
    setBusy(true);
    try {
      const d = await api('questions/import', {
        text,
        format,
        commit,
        skip_invalid: skipInvalid,
        publish_immediately: publishImmediately,
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

  const filtered = useMemo(() => {
    return items.filter(
      (q) =>
        (status === 'all' || q.status === status) &&
        (yearFilter === 'all' || String(q.year) === yearFilter) &&
        q.stem.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, status, yearFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Total draft count in current filtered list and overall
  const overallDraftsCount = useMemo(() => items.filter((q) => q.status === 'draft').length, [items]);
  const filteredDraftsCount = useMemo(() => filtered.filter((q) => q.status === 'draft').length, [filtered]);

  // Selection helpers
  const isPageAllSelected = paginatedItems.length > 0 && paginatedItems.every((q) => selected.has(q.id));

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isPageAllSelected) {
        paginatedItems.forEach((q) => next.delete(q.id));
      } else {
        paginatedItems.forEach((q) => next.add(q.id));
      }
      return next;
    });
  }

  function toggleSelectRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((q) => q.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // Bulk Publish Handlers
  async function publishSelected() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!window.confirm(`Publish ${count} selected question(s)? They will become available to enrolled students.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await api('questions/publish', { ids: Array.from(selected) });
      setMessage(res.message);
      setSelected(new Set());
      load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function publishAllDrafts() {
    if (overallDraftsCount === 0) return;
    if (!window.confirm(`Are you sure you want to publish ALL ${overallDraftsCount} draft question(s)?`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await api('questions/publish', { all_drafts: true });
      setMessage(res.message);
      setSelected(new Set());
      load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

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
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {overallDraftsCount > 0 && (
              <button
                className="btn"
                style={{
                  background: 'rgba(34, 197, 94, 0.14)',
                  color: '#4ade80',
                  borderColor: 'rgba(34, 197, 94, 0.4)',
                  fontWeight: 600,
                }}
                disabled={busy}
                onClick={publishAllDrafts}
                title="Publish all draft questions in the question bank at once"
              >
                <Globe size={15} /> Publish all drafts ({overallDraftsCount})
              </button>
            )}
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
            <option value="all">All Statuses ({items.length})</option>
            <option value="draft">Drafts ({items.filter((q) => q.status === 'draft').length})</option>
            <option value="published">Published ({items.filter((q) => q.status === 'published').length})</option>
            <option value="archived">Archived ({items.filter((q) => q.status === 'archived').length})</option>
          </select>
        </div>

        {/* Bulk Action Bar when items are selected */}
        {selected.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(59, 130, 246, 0.14)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#93c5fd' }}>
                ✓ {selected.size} of {filtered.length} question{filtered.length === 1 ? '' : 's'} selected
              </span>
              {selected.size < filtered.length && (
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={selectAllFiltered}
                >
                  Select all {filtered.length} matching questions
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn primary"
                style={{ background: '#22c55e', borderColor: '#16a34a', fontWeight: 600 }}
                disabled={busy}
                onClick={publishSelected}
              >
                <CheckCircle2 size={15} /> Publish {selected.size} selected
              </button>
              <button
                className="btn"
                style={{ fontSize: 12 }}
                onClick={clearSelection}
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {filtered.length ? (
          <div className="table-wrap">
            <table style={{ whiteSpace: 'normal' }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isPageAllSelected}
                      onChange={toggleSelectPage}
                      title={isPageAllSelected ? 'Deselect this page' : 'Select all on this page'}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th>Question</th>
                  <th>Academic path & Year</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((q) => {
                  const isSelected = selected.has(q.id);
                  return (
                    <tr key={q.id} style={{ background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(q.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <div style={{ fontWeight: 500 }}>{q.stem}</div>
                        <small style={{ display: 'block', color: 'var(--muted)', marginTop: 4 }}>
                          {q.difficulty} difficulty · {q.options?.length || 0} options · Answer: {String.fromCharCode(65 + (q.correct || 0))}
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
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                  padding: '12px 6px',
                  borderTop: '1px solid var(--border)',
                  fontSize: 13,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <span style={{ color: 'var(--muted)' }}>
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} questions
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
            ⚡ Supports 1–1,500 questions at a time (up to 25 MB). You can import as drafts or publish directly.
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

          <div className="form-actions" style={{ marginTop: 18, flexWrap: 'wrap', gap: 8 }}>
            <button
              className="btn"
              disabled={busy || !text.trim()}
              onClick={() => doImport(false)}
            >
              {busy && !preview ? 'Validating…' : 'Validate & preview'}
            </button>

            {preview && preview.valid > 0 && (
              <>
                {/* Option 1: Import as Drafts */}
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => doImport(true, preview.invalid > 0, false)}
                >
                  {busy ? 'Importing…' : `Import ${preview.valid} as drafts`}
                </button>

                {/* Option 2: Import and Publish Directly */}
                <button
                  className="btn primary"
                  style={{ background: '#22c55e', borderColor: '#16a34a', fontWeight: 600 }}
                  disabled={busy}
                  onClick={() => doImport(true, preview.invalid > 0, true)}
                >
                  <Globe size={15} /> {busy ? 'Publishing…' : `Import & Publish all ${preview.valid}`}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
