'use client';
import { useEffect, useState } from 'react';
import { Plus, Settings, Wallet, Layers, GraduationCap } from 'lucide-react';
import { api } from '../api';
import { Modal, Empty, money, Status } from '../../components/Common';

export default function Configuration({ type }: { type: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<string>('1');
  const [scopeText, setScopeText] = useState<string>('{"years":[1],"subjects":[],"modules":[]}');
  const [showAdvancedScope, setShowAdvancedScope] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const path = type === 'packages' ? 'packages/list' : 'packages/accounts';
  const load = () => api(path).then(setItems).catch((e) => setMessage(e.message));

  useEffect(() => {
    load();
  }, [type]);

  function openNewPackage(targetYear: string = '1') {
    const yNum = targetYear === 'all' ? [] : [Number(targetYear)];
    const sc = JSON.stringify({ years: yNum, subjects: [], modules: [] });
    setSelectedYear(targetYear);
    setScopeText(sc);
    setShowAdvancedScope(false);
    const yrLabel =
      targetYear === '1'
        ? '1st Year'
        : targetYear === '2'
        ? '2nd Year'
        : targetYear === '3'
        ? '3rd Year'
        : targetYear === '4'
        ? '4th Year'
        : targetYear === '5'
        ? '5th Year (Final Year)'
        : 'All Years';
    setEdit({
      name: targetYear === 'all' ? 'MBBS Comprehensive All-Years Package' : `${yrLabel} MBBS Preparation Package`,
      description:
        targetYear === 'all'
          ? 'Complete access to all MBBS years questions and practice modules.'
          : `Full question bank and practice BCQs tailored exclusively for ${yrLabel} MBBS curriculum.`,
      price: 50000,
      days: 365,
      year: targetYear === 'all' ? null : Number(targetYear),
      active: 1,
      scope: sc,
    });
  }

  function openEdit(item: any) {
    let yr = 'all';
    if (item.year) {
      yr = String(item.year);
    } else {
      try {
        const sc = JSON.parse(item.scope || '{}');
        if (sc.years?.length === 1) yr = String(sc.years[0]);
      } catch {}
    }
    setSelectedYear(yr);
    setScopeText(item.scope || '{"years":[],"subjects":[],"modules":[]}');
    setShowAdvancedScope(false);
    setEdit(item);
  }

  function handleYearChange(y: string) {
    setSelectedYear(y);
    const yrs = y === 'all' ? [] : [Number(y)];
    try {
      const prev = JSON.parse(scopeText || '{}');
      prev.years = yrs;
      setScopeText(JSON.stringify(prev));
    } catch {
      setScopeText(JSON.stringify({ years: yrs, subjects: [], modules: [] }));
    }
  }

  async function save(e: any) {
    e.preventDefault();
    setBusy(true);
    try {
      const p: any = Object.fromEntries(new FormData(e.currentTarget));
      if (type === 'packages') {
        p.price = Math.round(Number(p.price) * 100);
        p.days = Number(p.days);
        p.year = selectedYear === 'all' ? null : Number(selectedYear);
        let scObj: any = {};
        try {
          scObj = JSON.parse(scopeText);
        } catch {
          scObj = { years: p.year ? [p.year] : [], subjects: [], modules: [] };
        }
        if (p.year) {
          scObj.years = [p.year];
        }
        p.scope = scObj;
        p.active = p.active === 'on';
        p.id = edit.id;
      } else {
        p.enabled = p.enabled === 'on';
      }
      await api(path, p);
      setEdit(null);
      setMessage('Configuration saved successfully.');
      load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && <div className="notice">{message}</div>}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>{type === 'packages' ? 'Access packages by MBBS year' : 'Payment account instructions'}</h3>
            {type === 'packages' && (
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                Packages created for a specific MBBS year are only shown to students enrolled in that year.
              </small>
            )}
          </div>
          {type === 'packages' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={() => openNewPackage('1')}>
                <Plus size={16} /> New 1st Year package
              </button>
              <button className="btn" onClick={() => openNewPackage('all')}>
                <Plus size={16} /> New package (Any year)
              </button>
            </div>
          )}
        </div>

        {items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  {type === 'packages' && <th>Target MBBS Year</th>}
                  <th>{type === 'packages' ? 'Price' : 'Account title'}</th>
                  <th>{type === 'packages' ? 'Duration' : 'Number'}</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  let yr = i.year;
                  if (!yr) {
                    try {
                      const sc = JSON.parse(i.scope || '{}');
                      if (sc.years?.length === 1) yr = sc.years[0];
                    } catch {}
                  }
                  return (
                    <tr key={i.id || i.name}>
                      <td>
                        <strong>{i.name}</strong>
                        {i.description && (
                          <small style={{ display: 'block', color: 'var(--muted)', maxWidth: 300 }}>
                            {i.description}
                          </small>
                        )}
                      </td>
                      {type === 'packages' && (
                        <td>
                          {yr ? (
                            <span className="pill">
                              {yr === 1
                                ? '1st Year MBBS'
                                : yr === 2
                                ? '2nd Year MBBS'
                                : yr === 3
                                ? '3rd Year MBBS'
                                : yr === 4
                                ? '4th Year MBBS'
                                : '5th Year MBBS'}
                            </span>
                          ) : (
                            <span className="pill expired">All MBBS Years</span>
                          )}
                        </td>
                      )}
                      <td>{type === 'packages' ? money(i.price) : i.title || 'Not configured'}</td>
                      <td>{type === 'packages' ? i.days + ' days' : i.number || '—'}</td>
                      <td>
                        <Status value={i.active || i.enabled ? 'active' : 'inactive'} />
                      </td>
                      <td>
                        <button className="btn" onClick={() => openEdit(i)}>
                          Configure
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
            title="No access packages yet"
            text="Create the package terms students can purchase by MBBS year."
          />
        )}
      </section>

      {edit && (
        <Modal
          title={type === 'packages' ? 'Configure MBBS access package' : edit.name + ' account'}
          close={() => setEdit(null)}
        >
          <form onSubmit={save}>
            <label>
              {type === 'packages' ? 'Package name' : 'Payment method'}
              <input name="name" defaultValue={edit.name} readOnly={type !== 'packages'} required />
            </label>

            {type === 'packages' ? (
              <>
                {/* Target MBBS Year selector */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ marginBottom: 8 }}>Target MBBS student year</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {[
                      ['1', '1st Year MBBS'],
                      ['2', '2nd Year MBBS'],
                      ['3', '3rd Year MBBS'],
                      ['4', '4th Year MBBS'],
                      ['5', '5th Year MBBS'],
                      ['all', 'All MBBS Years (Universal)'],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn ${selectedYear === val ? 'primary' : ''}`}
                        style={{ padding: '6px 14px', fontSize: 13 }}
                        onClick={() => handleYearChange(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <small style={{ color: 'var(--muted)', display: 'block' }}>
                    {selectedYear === 'all'
                      ? 'Universal package: Visible to all students regardless of year. Unlocks all published questions.'
                      : `Enrolled year isolation: Only visible to ${
                          selectedYear === '1'
                            ? '1st Year'
                            : selectedYear === '2'
                            ? '2nd Year'
                            : selectedYear === '3'
                            ? '3rd Year'
                            : selectedYear === '4'
                            ? '4th Year'
                            : '5th Year'
                        } MBBS students. Unlocks the Year ${selectedYear} Question Bank.`}
                  </small>
                </div>

                <label>
                  Description
                  <textarea name="description" defaultValue={edit.description} />
                </label>

                <div className="form-grid">
                  <label>
                    Price (PKR)
                    <input
                      name="price"
                      type="number"
                      min="1"
                      step="0.01"
                      defaultValue={edit.price ? edit.price / 100 : ''}
                      required
                    />
                  </label>
                  <label>
                    Access duration (days)
                    <input
                      name="days"
                      type="number"
                      min="1"
                      max="3650"
                      defaultValue={edit.days || 365}
                      required
                    />
                  </label>
                </div>

                <div style={{ margin: '14px 0' }}>
                  <button
                    type="button"
                    className="text-button"
                    style={{ fontSize: 13, textDecoration: 'underline' }}
                    onClick={() => setShowAdvancedScope(!showAdvancedScope)}
                  >
                    {showAdvancedScope ? 'Hide academic scope JSON' : 'Advanced: Customize academic scope JSON'}
                  </button>

                  {showAdvancedScope && (
                    <div style={{ marginTop: 8 }}>
                      <label>
                        Included academic scope
                        <textarea
                          value={scopeText}
                          onChange={(e) => setScopeText(e.target.value)}
                          style={{ fontFamily: 'monospace', fontSize: 12 }}
                          required
                        />
                        <div className="field-note">
                          Auto-configured based on selected year. You can also specify subjects or modules.
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <label className="row">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={!!edit.active}
                    style={{ width: 18, minHeight: 18, margin: 0 }}
                  />
                  Available to students
                </label>
              </>
            ) : (
              <>
                <label>
                  Account title
                  <input name="title" defaultValue={edit.title} />
                </label>
                <label>
                  Account or mobile number
                  <input name="number" defaultValue={edit.number} />
                </label>
                <label>
                  Payment instructions
                  <textarea name="instructions" defaultValue={edit.instructions} />
                </label>
                <label>
                  QR code image URL (optional)
                  <input
                    name="qr"
                    type="url"
                    defaultValue={edit.qr}
                    placeholder="https://…"
                  />
                </label>
                <label className="row">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={edit.enabled}
                    style={{ width: 18, minHeight: 18, margin: 0 }}
                  />
                  Enable this payment method
                </label>
              </>
            )}

            <div className="form-actions">
              <button className="btn" type="button" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button disabled={busy} className="btn primary">
                {busy ? 'Saving…' : 'Save configuration'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
