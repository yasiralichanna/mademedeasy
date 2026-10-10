'use client';
import { BookOpen, Target, Bookmark, Timer, CheckCircle2, Sparkles } from 'lucide-react';
import { Head, Empty, Status, date } from '../../components/Common';

export default function Dashboard({
  user,
  data,
  navigate,
}: {
  user: any;
  data: any;
  navigate: (s: string) => void;
}) {
  const stats = [
    ['Questions attempted', data?.stats?.answered || 0, 'From your saved sessions', BookOpen],
    ['Accuracy', data?.stats?.answered ? data.stats.accuracy + '%' : '—', 'Your answered questions', Target],
    ['Completed sessions', data?.stats?.completed || 0, 'Practice sessions', Timer],
    ['Bookmarks', data?.stats?.bookmarks || 0, 'Ready for your next revision', Bookmark],
  ];

  return (
    <>
      <Head
        title={'Hello, ' + user.name.split(' ')[0] + '.'}
        description="A little progress today makes a difference tomorrow."
      />
      <section className="welcome-card">
        <div>
          <span className="eyebrow">YOUR NEXT STEP</span>
          <h2>
            {data?.access?.state === 'active'
              ? 'Make time for your next session.'
              : !data?.profile
              ? 'Let’s get you ready to study.'
              : data?.access?.state === 'pending'
              ? 'Your payment is being reviewed.'
              : 'Your preparation starts here.'}
          </h2>
          <p>
            {!data?.profile
              ? 'Complete your enrollment, choose a package, and submit your payment proof.'
              : data?.access?.state === 'active'
              ? 'Practice at your own pace with clinical rationale and explanations.'
              : 'Choose a package and follow the payment instructions. Access begins after administrator approval.'}
          </p>
        </div>
        <button
          className="btn"
          onClick={() =>
            navigate(
              !data?.profile
                ? 'profile'
                : data?.access?.state === 'active'
                ? 'practice'
                : 'payments'
            )
          }
        >
          {!data?.profile
            ? 'Complete enrollment'
            : data?.access?.state === 'active'
            ? 'Start practicing'
            : 'View payment & access'}
        </button>
      </section>

      {data?.access?.state !== 'active' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #e6f6f4 0%, #e9f4f7 100%)',
            border: '1px solid #c2e8e1',
            borderRadius: '12px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '26px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--teal)',
                display: 'grid',
                placeItems: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <strong style={{ color: '#094741', fontSize: '15px', display: 'block' }}>
                Test 15 Authentic Demo BCQs for Free
              </strong>
              <small style={{ color: '#437672', fontSize: '13px' }}>
                Experience our real question bank with detailed clinical rationales before completing your package payment.
              </small>
            </div>
          </div>
          <button
            className="btn primary"
            onClick={() => navigate('demo')}
            style={{ fontSize: '13px', padding: '9px 18px', fontWeight: '700' }}
          >
            Launch 15 Demo BCQs
          </button>
        </div>
      )}

      <div className="stats">
        {stats.map(([label, value, detail, Icon]: any) => (
          <div className="stat" key={label}>
            <div className="stat-top">
              {label}
              <Icon />
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <div className="grid-two">
        <div>
          <section className="panel">
            <div className="panel-head">
              <h3>Choose your study mode</h3>
              <span className="badge-count">PRACTICE MODES</span>
            </div>
            <div className="quick-grid">
              <button className="quick" onClick={() => navigate('practice')}>
                <BookOpen />
                <span>
                  <strong>Practice BCQs</strong>
                  <small>Learn one question at a time, with explanations.</small>
                </span>
              </button>
              <button
                className="quick"
                onClick={() => navigate('demo')}
                style={{ borderColor: '#bce3dc', background: '#f8fdfc' }}
              >
                <Sparkles style={{ color: 'var(--teal)' }} />
                <span>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Demo BCQs
                    <span className="badge-count" style={{ fontSize: '10px' }}>15 FREE</span>
                  </strong>
                  <small>15 authentic published questions with full rationales.</small>
                </span>
              </button>
              <button className="quick" onClick={() => navigate('bookmarks')}>
                <Bookmark />
                <span>
                  <strong>Revisit bookmarks</strong>
                  <small>Your saved questions, ready to review.</small>
                </span>
              </button>
              <button className="quick" onClick={() => navigate('incorrect')}>
                <Target />
                <span>
                  <strong>Revise your mistakes</strong>
                  <small>Focus on questions you previously missed.</small>
                </span>
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Recent sessions</h3>
              <button className="text-button" onClick={() => navigate('results')}>
                View history
              </button>
            </div>
            {data?.recent?.length ? (
              data.recent.map((a: any) => (
                <div className="list-row" key={a.id}>
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {date(a.created)} · {a.mode}
                    </small>
                  </span>
                  <button className="btn" onClick={() => navigate('attempt:' + a.id)}>
                    {a.finished ? 'Review' : 'Resume'}
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Your first session is waiting"
                text="Your practice session history will appear here."
              />
            )}
          </section>
        </div>

        <div>
          <section className="panel">
            <div className="panel-head">
              <h3>Your access</h3>
              <Status value={data?.access?.state || 'inactive'} />
            </div>
            <div className="info-line">
              <span>Enrollment</span>
              <span>{data?.profile ? 'Complete' : 'Required'}</span>
            </div>
            <div className="info-line">
              <span>MBBS year</span>
              <span>{data?.profile ? 'Year ' + data.profile.year : 'Not selected'}</span>
            </div>
            <div className="info-line">
              <span>Access expires</span>
              <span>{data?.access?.expires ? date(data.access.expires) : '—'}</span>
            </div>
            <button className="text-button" onClick={() => navigate('payments')}>
              Manage payment & access
            </button>
          </section>

          <section className="panel">
            <h3 style={{ marginBottom: 23 }}>Getting started</h3>
            <div className="steps">
              {[
                ['Complete enrollment', 'Add your college, year and CNIC', !!data?.profile],
                [
                  'Submit payment proof',
                  'Choose a package and upload your proof',
                  data?.access?.state === 'pending' || data?.access?.state === 'active',
                ],
                [
                  'Begin preparing',
                  'Practice high-yield BCQs',
                  data?.access?.state === 'active',
                ],
              ].map(([title, text, done], i) => (
                <div className="step" key={i}>
                  <span className={'step-number ' + (done ? 'done' : '')}>
                    {done ? <CheckCircle2 size={15} /> : i + 1}
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <p className="muted" style={{ fontSize: 12, padding: '0 8px' }}>
            Practice results support your revision.
          </p>
        </div>
      </div>
    </>
  );
}
