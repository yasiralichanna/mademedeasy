'use client';
import { useEffect, useState } from 'react';
import { Plus, Upload, FileDown, Search } from 'lucide-react';
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
  const [sectionFilter, setSectionFilter] = useState('all');
  const [importSection, setImportSection] = useState('all');
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
      p.exam_type = p.exam_type || 'all';
      p.incorrect = JSON.parse(p.incorrect || '{}');
      await api('questions/save', p);
      setEdit(null);
      load();
      setMessage('Question saved successfully.');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doImport(commit = false) {
    setBusy(true);
    try {
      const d = await api('questions/import', { text, format, commit, default_exam_type: importSection });
      if (commit) {
        setImporting(false);
        setPreview(null);
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
      (sectionFilter === 'all' || (q.exam_type || 'all') === sectionFilter) &&
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
              Question bank <span className="badge-count">{items.length}</span>
            </h3>
            <small style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
              Questions are grouped by MBBS year and unlocked for students with matching package access.
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
              <Upload size={15} /> Import
            </button>
            <button
              className="btn primary"
              onClick={() =>
                setEdit({
                  options: ['', '', '', ''],
                  correct: 0,
                  status: 'draft',
                  year: yearFilter !== 'all' ? Number(yearFilter) : 1,
                  exam_type: sectionFilter !== 'all' ? sectionFilter : 'all',
                  difficulty: 'medium',
                  tags: [],
                  incorrect: {},
                })
              }
            >
              <Plus size={15} /> New question
            </button>
          </div>
        </div>

        <div className="filters">
          <input
            aria-label="Search question stems"
            placeholder="Search question stems…"
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
            aria-label="Filter by Exam Section"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="all">All Exam Sections</option>
            <option value="practice">Practice BCQs Section</option>
            <option value="module">Module Exam Section Only</option>
            <option value="final">Final Exam Section Only</option>
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
                  <th>Exam Section</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id}>
                    <td style={{ minWidth: 240 }}>
                      {q.stem}
                      <small style={{ display: 'block', color: 'var(--muted)', marginTop: 4 }}>
                        {q.difficulty} · {q.options.length} options
                      </small>
                    </td>
                    <td style={{ minWidth: 160 }}>
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
                      <span
                        className="pill"
                        style={{
                          background:
                            q.exam_type === 'module'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : q.exam_type === 'practice'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : q.exam_type === 'final'
                              ? 'rgba(249, 115, 22, 0.15)'
                              : 'rgba(20, 184, 166, 0.15)',
                          color:
                            q.exam_type === 'module'
                              ? '#c084fc'
                              : q.exam_type === 'practice'
                              ? '#60a5fa'
                              : q.exam_type === 'final'
                              ? '#fb923c'
                              : '#2dd4bf',
                          fontWeight: 600,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {q.exam_type === 'module'
                          ? 'Module Exam Only'
                          : q.exam_type === 'practice'
                          ? 'Practice BCQs Only'
                          : q.exam_type === 'final'
                          ? 'Final Exam Only'
                          : 'All Sections'}
                      </span>
                    </td>
                    <td>
                      <Status value={q.status} />
                    </td>
                    <td>
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
            title="No matching questions"
            text="Create questions or import your source-based BCQs. Questions are scoped to students by MBBS year packages."
          />
        )}
      </section>

      {edit && (
        <Modal
          title={edit.id ? 'Review question' : 'Create question'}
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
                    defaultValue={edit.options[i] || ''}
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
                Target Exam Section
                <select name="exam_type" defaultValue={edit.exam_type || 'all'}>
                  <option value="all">All Sections (Practice, Module & Final Exam)</option>
                  <option value="practice">Practice BCQs Section Only</option>
                  <option value="module">Module Exam Section Only</option>
                  <option value="final">Final Exam Section Only</option>
                </select>
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
              <input name="tags" defaultValue={edit.tags.join('|')} />
            </label>
            <label>
              Question image URL (optional)
              <input name="image" type="url" defaultValue={edit.image || ''} />
            </label>
            <div className="notice">
              Publishing makes this question available in the Question Bank for students subscribed to this MBBS Year's package.
            </div>
            <button className="btn primary wide" disabled={busy}>
              {busy ? 'Saving…' : 'Save question'}
            </button>
          </form>
        </Modal>
      )}

      {importing && (
        <Modal title="Import questions" close={() => setImporting(false)}>
          <div className="row" style={{ marginBottom: 20 }}>
            <a className="btn" href="/api/questions/template?format=json">
              <FileDown size={15} /> JSON template
            </a>
            <a className="btn" href="/api/questions/template?format=csv">
              <FileDown size={15} /> CSV template
            </a>
          </div>
          <label>
            Format
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setPreview(null);
              }}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label>
            Assign to Exam Section (default if not in file)
            <select
              value={importSection}
              onChange={(e) => {
                setImportSection(e.target.value);
                setPreview(null);
              }}
            >
              <option value="all">All Sections (Practice, Module & Final Exam)</option>
              <option value="practice">Practice BCQs Section Only</option>
              <option value="module">Module Exam Section Only</option>
              <option value="final">Final Exam Section Only</option>
            </select>
            <small style={{ display: 'block', color: 'var(--muted)', marginTop: 4 }}>
              Questions marked for Module Exam are only accessible in the Module Exam section.
            </small>
          </label>
          <label>
            Upload source file
            <input
              type="file"
              accept=".json,.csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setText(await file.text());
                  setPreview(null);
                }
              }}
            />
          </label>
          <label>
            Import content
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              style={{ minHeight: 150 }}
            />
          </label>
          <small>1–200 questions · Maximum 1 MB · All imported questions remain drafts</small>
          {preview && (
            <div className="notice">
              <strong>
                {preview.valid} valid · {preview.invalid} invalid
              </strong>
              {preview.preview.map((r: any) => (
                <div key={r.row} style={{ paddingTop: 8, fontSize: 13 }}>
                  Row {r.row}: {r.error || (r.question?.exam_type ? `[${r.question.exam_type.toUpperCase()}] ` : '') + (r.question?.stem?.slice(0, 60) || '')}
                  {r.duplicate && ' · Potential duplicate — review after import'}
                </div>
              ))}
            </div>
          )}
          <div className="form-actions">
            <button className="btn" disabled={busy || !text} onClick={() => doImport()}>
              Validate & preview
            </button>
            <button
              className="btn primary"
              disabled={busy || !preview || preview.invalid > 0}
              onClick={() => doImport(true)}
            >
              Import as drafts
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
