'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Clock3, ShieldCheck, Upload, CheckCircle2, GraduationCap, Sparkles } from 'lucide-react';
import { api } from '../api';
import { Head, Empty, Modal, Status, money, date } from '../../components/Common';

export default function Payments({
  refresh,
  navigate,
}: {
  refresh: () => void;
  navigate?: (s: string) => void;
}) {
  const [data, setData] = useState<any>({
    packages: [],
    accounts: [],
    payments: [],
    access: { state: 'inactive' },
  });
  const [profile, setProfile] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [method, setMethod] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([
      api('packages/list'),
      api('packages/accounts'),
      api('payments/list'),
      api('access/status'),
      api('profiles/profile').catch(() => null),
    ])
      .then(([packages, accounts, payments, access, prof]) => {
        setData({ packages, accounts, payments, access });
        setProfile(prof);
      })
      .catch((e) => setMessage(e.message));

  useEffect(() => {
    load();
  }, []);

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = new FormData(e.currentTarget);
      p.set('package_id', selected.id);
      await api('payments/submit', p);
      setSelected(null);
      setMessage(
        'Your payment proof has been submitted successfully. Please wait while the administrator verifies your payment. Your BCQ access will be activated after approval.'
      );
      load();
      refresh();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  const acct = data.accounts.find((a: any) => a.name === method);

  return (
    <>
      <Head
        title="Payment & access"
        description="Choose your preparation package and keep track of your payment."
      />
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}

      {data.access.state === 'pending' ? (
        <div className="status-banner">
          <Clock3 />
          <div>
            <h3>Waiting for payment confirmation</h3>
            <p>
              Your payment proof has been submitted successfully. Please wait while the administrator verifies your payment. Your BCQ access will be activated after approval.
            </p>
          </div>
        </div>
      ) : data.access.state === 'rejected' ? (
        <div className="notice error">
          <strong>Payment rejected</strong>
          <p>{data.access.reason}</p>
          <p>You can submit a corrected payment below. Your previous submission is kept in your history.</p>
        </div>
      ) : data.access.state === 'active' ? (
        <div className="notice">
          <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Your access is active until {date(data.access.expires)}.
        </div>
      ) : data.access.state === 'expired' ? (
        <div className="notice">Your access has expired. Choose a package below to renew.</div>
      ) : data.access.state === 'suspended' ? (
        <div className="notice error">Your access is suspended. Contact the administrator for assistance.</div>
      ) : data.access.state === 'scheduled' ? (
        <div className="notice">Your access begins on {date(data.access.starts)}.</div>
      ) : null}

      {data.access.state !== 'active' && navigate && (
        <div
          style={{
            background: '#eef8f6',
            border: '1px solid #bfe7df',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '22px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={20} color="var(--teal)" />
            <div>
              <strong style={{ fontSize: '14px', color: '#0f524a', display: 'block' }}>
                Unsure which package to choose?
              </strong>
              <small style={{ fontSize: '13px', color: '#457973' }}>
                Try 15 authentic demo BCQs from our real question bank for free before subscribing.
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => navigate('demo')}
            style={{ fontSize: '13px', padding: '8px 16px', fontWeight: '700' }}
          >
            Try 15 Free Demo BCQs
          </button>
        </div>
      )}

      <div className="panel-head" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3>Available packages</h3>
          {profile?.year ? (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill">
                <GraduationCap size={13} style={{ marginRight: 4 }} />
                ENROLLED IN YEAR {profile.year} MBBS
              </span>
              <small style={{ color: 'var(--muted)' }}>
                Showing packages and question bank access tailored for your enrolled MBBS Year {profile.year}.
              </small>
            </div>
          ) : (
            <small>Manual payment · Administrator approval</small>
          )}
        </div>
      </div>

      {data.packages.length ? (
        <div className="card-grid" style={{ marginBottom: 28 }}>
          {data.packages.map((p: any) => {
            let targetYr = p.year;
            if (!targetYr) {
              try {
                const sc = JSON.parse(p.scope || '{}');
                if (sc.years?.length === 1) targetYr = sc.years[0];
              } catch {}
            }
            return (
              <section className="package-card" key={p.id}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="pill">{p.days} DAYS ACCESS</span>
                  {targetYr ? (
                    <span className="pill" style={{ background: '#e0f2f1', color: '#00695c' }}>
                      {targetYr === 1
                        ? '1st Year MBBS'
                        : targetYr === 2
                        ? '2nd Year MBBS'
                        : targetYr === 3
                        ? '3rd Year MBBS'
                        : targetYr === 4
                        ? '4th Year MBBS'
                        : '5th Year MBBS'}
                    </span>
                  ) : (
                    <span className="pill expired">All MBBS Years</span>
                  )}
                </div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="price">
                  {money(p.price)}
                  <small style={{ marginLeft: 8 }}>PKR</small>
                </div>
                <small style={{ color: 'var(--muted)', display: 'block' }}>
                  Unlocks {targetYr ? `Year ${targetYr}` : 'all MBBS'} Question Bank & Practice BCQs
                </small>
                <button
                  className="btn primary"
                  disabled={data.access.state === 'pending'}
                  onClick={() => {
                    setSelected(p);
                    setMethod('');
                  }}
                >
                  {data.access.state === 'pending' ? 'Pending review' : 'Select package'}
                </button>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title={profile?.year ? `No packages available for Year ${profile.year} yet` : 'Packages will be available soon'}
            text={
              profile?.year
                ? `Your administrator has not configured active packages for Year ${profile.year} yet. Please contact support or check back soon.`
                : 'Your administrator has not configured any access packages yet.'
            }
          />
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h3>Payment history</h3>
          <CreditCard size={20} color="var(--teal)" />
        </div>
        {data.payments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Package / submitted</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{JSON.parse(p.snapshot).name}</strong>
                      <small style={{ display: 'block' }}>{date(p.created)}</small>
                      {p.reason && (
                        <small style={{ display: 'block', color: 'var(--red)', whiteSpace: 'normal' }}>
                          Reason: {p.reason}
                        </small>
                      )}
                    </td>
                    <td>
                      {p.reference}
                      <small style={{ display: 'block' }}>{p.method}</small>
                    </td>
                    <td>{money(p.amount)}</td>
                    <td>
                      <Status value={p.status} />
                    </td>
                    <td>
                      <a className="btn" href={'/api/payments/proof?id=' + p.id} target="_blank" rel="noreferrer">
                        View proof
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No payments submitted" text="Your submitted proof and review decisions will appear here." />
        )}
      </section>

      {selected && (
        <Modal title={'Pay for ' + selected.name} close={() => setSelected(null)}>
          <div className="notice">
            Pay {money(selected.price)} using an enabled account below, then upload the proof. Uploading proof does not grant immediate access.
          </div>
          <form onSubmit={submit}>
            <label>
              Payment method
              <select name="method" value={method} required onChange={(e) => setMethod(e.target.value)}>
                <option value="">Choose a method</option>
                {data.accounts.map((a: any) => (
                  <option disabled={!a.enabled} value={a.name} key={a.name}>
                    {a.name}
                    {!a.enabled ? ' · Unavailable' : ''}
                  </option>
                ))}
              </select>
            </label>
            {acct?.enabled && (
              <section className="panel">
                <div className="info-line">
                  <span>Account title</span>
                  <strong>{acct.title}</strong>
                </div>
                <div className="info-line">
                  <span>Account number</span>
                  <strong>{acct.number}</strong>
                </div>
                <p className="subtitle" style={{ whiteSpace: 'pre-wrap' }}>
                  {acct.instructions}
                </p>
                {acct.qr && <img src={acct.qr} alt="Payment QR code" width={180} />}
              </section>
            )}
            <div className="form-grid">
              <label>
                Transaction reference
                <input name="reference" required minLength={4} maxLength={100} placeholder="From your payment receipt" />
              </label>
              <label>
                Amount paid (PKR)
                <input name="amount" type="number" min="1" step="0.01" defaultValue={selected.price / 100} required />
              </label>
              <label className="full">
                Payment date
                <input name="paid_date" type="date" required max={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="full">
                Payment proof
                <input name="proof" type="file" accept="image/png,image/jpeg,application/pdf" required />
                <div className="field-note">JPG, PNG or PDF · Maximum 5 MB · Stored privately</div>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn" type="button" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy || !acct?.enabled}>
                <Upload size={16} />
                {busy ? 'Submitting…' : 'Submit payment proof'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
