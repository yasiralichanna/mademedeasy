'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Bookmark, Target, GraduationCap } from 'lucide-react';
import { api } from '../api';
import { Head, Empty } from '../../components/Common';

export default function Start({
  mode,
  navigate,
  user,
}: {
  mode: string;
  navigate: (s: string) => void;
  user?: any;
}) {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [year, setYear] = useState<string>(user?.year ? String(user.year) : '4');
  const [subject, setSubject] = useState('');
  const [module, setModule] = useState('');
  const [busy, setBusy] = useState(false);
  const revision = ['bookmarks', 'incorrect'].includes(mode) ? mode : null;
  const [revisionQs, setRevisionQs] = useState<any[]>([]);

  const load = () => {
    setError('');
    if (user?.year) {
      setYear(String(user.year));
    } else {
      api('profiles/profile')
        .then((p) => {
          if (p?.year) setYear(String(p.year));
        })
        .catch(() => {});
    }

    api('questions/catalog?mode=practice')
      .then((cat) => {
        setCatalog(cat);
        if (!user?.year) {
          const yrs = [...new Set(cat.map((c: any) => Number(c.year)))].sort((a: any, b: any) => a - b);
          if (yrs.length > 0) {
            setYear(String(yrs[0]));
          }
        }
      })
      .catch((e) => setError(e.message));

    if (revision) {
      api('attempts/revision?mode=' + revision)
        .then(setRevisionQs)
        .catch((e) => setError(e.message));
    }
  };

  useEffect(() => {
    load();
  }, [mode]);

  async function start(e: any) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const p: any = Object.fromEntries(new FormData(e.currentTarget));
      p.mode = 'practice';
      p.count = Number(p.count);
      p.year = Number(p.year || year);
      p.revision = revision;
      const d = await api('attempts/start', p);
      navigate('attempt:' + d.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'bookmarks'
      ? 'Your bookmarks'
      : mode === 'incorrect'
      ? 'Revise your mistakes'
      : 'Practice BCQs';
  const filtered = catalog.filter((c) => c.year === Number(year));

  return (
    <>
      <Head
        title={title}
        description={
          revision
            ? 'Return to the questions that deserve another look.'
            : 'Choose what you want to study. Get an explanation after each answer.'
        }
      />
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button className="text-button" style={{ marginLeft: 15 }} onClick={load}>
            Retry
          </button>
        </div>
      )}
      {!error && catalog.length === 0 ? (
        <section className="panel">
          <Empty
            title="Your question bank is being prepared"
            text="Published questions within your package scope will appear here when your administrator adds them."
          />
        </section>
      ) : !error && revision && revisionQs.length === 0 ? (
        <section className="panel">
          <Empty
            title={revision === 'bookmarks' ? 'No bookmarks yet' : 'No mistakes to revise yet'}
            text={
              revision === 'bookmarks'
                ? 'Save questions during a session to revisit them here.'
                : 'Previously incorrect questions will appear after you answer BCQs.'
            }
          />
        </section>
      ) : (
        <div className="grid-two">
          <section className="panel">
            <div className="panel-head">
              <h3>Set up your session</h3>
              {revision && <span className="badge-count">{revisionQs.length} QUESTIONS</span>}
            </div>

            {/* Automatically display enrolled year and section badge */}
            <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                className="pill"
                style={{
                  background: '#e0f2f1',
                  color: '#00695c',
                  fontSize: 13,
                  padding: '7px 14px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <GraduationCap size={16} style={{ marginRight: 6 }} />
                MBBS YEAR {year} ({year === '1' ? '1st' : year === '2' ? '2nd' : year === '3' ? '3rd' : year === '4' ? '4th' : '5th'} Year Enrolled)
              </span>
              <span
                className="pill"
                style={{
                  background: '#e3f2fd',
                  color: '#0d47a1',
                  fontSize: 13,
                  padding: '7px 14px',
                  fontWeight: 700,
                }}
              >
                PRACTICE BCQS SECTION
              </span>
            </div>

            <form onSubmit={start}>
              {/* Year is automatically passed via hidden input without asking user */}
              <input type="hidden" name="year" value={year} />

              <div className="form-grid">
                <label>
                  Subject
                  <select
                    name="subject"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setModule('');
                    }}
                  >
                    <option value="">All available subjects</option>
                    {[...new Set(filtered.map((c) => c.subject))].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Module
                  <select
                    name="module"
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                  >
                    <option value="">All modules in subject</option>
                    {[
                      ...new Set(
                        filtered
                          .filter((c) => !subject || c.subject === subject)
                          .map((c) => c.module)
                      ),
                    ].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Topic
                  <select name="topic">
                    <option value="">All topics in module</option>
                    {[
                      ...new Set(
                        filtered
                          .filter(
                            (c) =>
                              (!subject || c.subject === subject) &&
                              (!module || c.module === module)
                          )
                          .map((c) => c.topic)
                      ),
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Number of questions
                  <input
                    name="count"
                    type="number"
                    defaultValue={10}
                    min={1}
                    max={Math.min(
                      100,
                      Math.max(
                        1,
                        revision
                          ? revisionQs.length
                          : filtered.reduce((a, b) => a + b.count, 0)
                      )
                    )}
                    required
                  />
                </label>
              </div>

              <div className="notice">
                Your answers are saved when submitted. You will see the best answer and clinical explanation immediately. You can leave and resume your session anytime.
              </div>
              <button className="btn primary wide" disabled={busy || !!error}>
                {busy ? 'Preparing…' : 'Start practice'}
              </button>
            </form>
          </section>

          <div>
            <section className="panel">
              <div className="panel-head">
                <h3>Practice BCQs</h3>
                <span className="pill">Year {year}</span>
              </div>
              {filtered.length ? (
                filtered.map((c, i) => (
                  <div className="list-row" key={i}>
                    <span>
                      <strong>{c.subject}</strong>
                      <small>
                        {c.module} / {c.topic}
                      </small>
                    </span>
                    <span className="badge-count">{c.count} BCQs</span>
                  </div>
                ))
              ) : (
                <p className="subtitle">No published content for Year {year} within your package scope.</p>
              )}
            </section>
            {revision && (
              <section className="panel">
                <h3 style={{ marginBottom: 10 }}>Questions to revisit</h3>
                {revisionQs.slice(0, 20).map((q) => (
                  <div className="list-row" key={q.id}>
                    <span>
                      {q.stem}
                      <small>
                        {q.module} · {q.topic}
                      </small>
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
