'use client';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Head, Empty, date } from '../../components/Common';
import { Target } from 'lucide-react';

export default function Results({ navigate }: { navigate: (s: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('analytics/dashboard'), api('attempts/list')])
      .then(([d, a]) => {
        setData(d);
        setAttempts(a);
      })
      .catch((e) => setError(e.message));
  }, []);

  const stats = data?.stats;

  return (
    <>
      <Head
        title="Results & progress"
        description="See what you have learned and where to focus next."
      />
      {error && <div className="notice error">{error}</div>}
      <div className="stats">
        {[
          ['Questions answered', stats?.answered || 0],
          ['Accuracy', stats?.answered ? stats.accuracy + '%' : '—'],
          ['Completed sessions', stats?.completed || 0],
          ['Correct answers', stats?.correct || 0],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <div className="stat-top">{label}</div>
            <strong>{value}</strong>
            <small>From saved practice sessions</small>
          </div>
        ))}
      </div>
      <div className="grid-two">
        <div>
          <section className="panel">
            <div className="panel-head">
              <h3>Attempt history</h3>
            </div>
            {attempts.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => {
                      const r = a.result ? JSON.parse(a.result) : null;
                      return (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.title}</strong>
                            <small style={{ display: 'block' }}>
                              {a.finished ? 'Completed' : 'In progress'}
                            </small>
                          </td>
                          <td>{date(a.created)}</td>
                          <td>{r ? r.percentage + '%' : '—'}</td>
                          <td>
                            <button
                              className="btn"
                              onClick={() => navigate('attempt:' + a.id)}
                            >
                              {a.finished ? 'Review' : 'Resume'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No sessions yet"
                text="Your practice sessions will appear here."
              />
            )}
          </section>
          {['subjects', 'modules'].map((kind) => (
            <section className="panel" key={kind}>
              <h3 style={{ marginBottom: 20 }}>
                {kind === 'subjects' ? 'Subject performance' : 'Module performance'}
              </h3>
              {stats && Object.keys(stats[kind]).length ? (
                Object.entries(stats[kind]).map(([name, v]: any) => (
                  <div style={{ marginBottom: 18 }} key={name}>
                    <div
                      className="row"
                      style={{ justifyContent: 'space-between', fontSize: 14 }}
                    >
                      <strong>{name}</strong>
                      <span>
                        {Math.round((v.correct / v.answered) * 100)}% · {v.answered} answered
                      </span>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{ width: (v.correct / v.answered) * 100 + '%' }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <Empty
                  title="No performance data yet"
                  text="Answer practice questions to see your progress."
                />
              )}
            </section>
          ))}
        </div>
        <div>
          <section className="panel">
            <div className="panel-head">
              <h3>Topics to revise</h3>
              <Target size={18} color="var(--teal)" />
            </div>
            {stats &&
            Object.entries(stats.topics).some(([_, v]: any) => v.incorrect) ? (
              Object.entries(stats.topics)
                .filter(([_, v]: any) => v.incorrect > 0)
                .sort((a: any, b: any) => b[1].incorrect - a[1].incorrect)
                .map(([name, v]: any) => (
                  <div className="list-row" key={name}>
                    <span>
                      {name}
                      <small>
                        {v.incorrect} incorrect of {v.answered} answered
                      </small>
                    </span>
                  </div>
                ))
            ) : (
              <Empty
                title="No revision topics yet"
                text="Your actual mistakes will guide what to revisit."
              />
            )}
            <button
              className="text-button"
              onClick={() => navigate('incorrect')}
            >
              Revise incorrect questions
            </button>
          </section>
          <section className="panel">
            <h3>How accuracy is calculated</h3>
            <p className="subtitle">
              Correct answers divided by answered questions across practice sessions.
            </p>
            <p className="subtitle">
              Results are for revision and self-assessment.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
