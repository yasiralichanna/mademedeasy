'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, BookOpen, Clock3, Eye, EyeOff, MailCheck, Sparkles } from 'lucide-react';
import DemoBcqs from '../demo/DemoBcqs';

export default function Auth({ reload }: { reload: () => Promise<boolean> }) {
  const [mode, setMode] = useState(
    new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').has('reset') ? 'reset' : 'login'
  );
  const [brand, setBrand] = useState<any>({ name: 'MedPrep', suffix: 'BCQs' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const [showDemo, setShowDemo] = useState(
    typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).has('demo') || window.location.pathname === '/demo')
  );

  // OTP Verification state for login
  const [otpPending, setOtpPending] = useState(false);
  const [loginCreds, setLoginCreds] = useState<{ email: string; password?: string }>({ email: '', password: '' });
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    fetch('/api/admin/branding')
      .then((r) => r.json())
      .then((d: any) => {
        if (d.data) setBrand(d.data);
      })
      .catch(() => {});
  }, []);

  async function resendOtp() {
    if (busy || !loginCreds.email) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCreds),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error?.message);
      setMessage(d.data?.message || `A new verification code has been sent from y7087749@gmail.com to your email.`);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    if (mode === 'login' && otpPending) {
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginCreds.email,
            password: loginCreds.password,
            otp: otpCode.trim(),
          }),
        });
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error?.message);
        if (!(await reload())) {
          throw Error('Your session could not be retained in this window. Open MedPrep in a new tab and sign in again.');
        }
      } catch (e: any) {
        setMessage(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    const p = Object.fromEntries(new FormData(e.currentTarget));
    if (mode === 'reset') {
      p.token = new URLSearchParams(window.location.search).get('reset') || '';
    }

    try {
      const r = await fetch('/api/auth/' + mode, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error?.message);

      if (mode === 'login') {
        if (d.data?.otpRequired) {
          setOtpPending(true);
          setLoginCreds({ email: String(p.email), password: String(p.password) });
          setOtpCode('');
          setMessage(d.data.message || `Verification code sent from y7087749@gmail.com to ${p.email}`);
          return;
        }
        if (!(await reload())) {
          throw Error('Your session could not be retained in this window. Open MedPrep in a new tab and sign in again.');
        }
      } else {
        setMessage(d.data?.message || 'Account created. You can now sign in.');
        if (mode === 'register' || mode === 'setup') {
          setMode('login');
          setOtpPending(false);
        }
      }
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (showDemo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', padding: '24px 16px' }}>
        <DemoBcqs
          onExit={() => setShowDemo(false)}
          onSignUp={() => {
            setShowDemo(false);
            setMode('register');
          }}
        />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <GraduationCap />
          </span>
          {brand.name}
          <span className="brand-suffix">{brand.suffix}</span>
        </a>
        <div className="story-body">
          <span className="eyebrow">FOR THE DOCTORS OF TOMORROW</span>
          <h1>
            One question closer
            <br />
            to your next milestone.
          </h1>
          <p>A focused space to prepare for MBBS module exams and finals. Learn, revise, and see your progress.</p>
          <div className="story-list">
            <span>
              <BookOpen />
              Module-based preparation
            </span>
            <span>
              <Clock3 />
              Timed exam practice
            </span>
            <span>
              <ShieldCheck />
              Access reviewed by your administrator
            </span>
          </div>

          <div style={{ marginTop: '36px' }}>
            <button
              type="button"
              onClick={() => setShowDemo(true)}
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(105, 208, 196, 0.5)',
                backdropFilter: 'blur(8px)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: '700',
                fontSize: '14px',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={18} color="#69d0c4" />
              Try 15 Free Demo BCQs (No Sign In)
            </button>
          </div>
        </div>
        <small>Made for MBBS students in Pakistan</small>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div
            style={{
              background: '#eef8f6',
              border: '1px solid #c0e7df',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#13544d', fontWeight: '600' }}>
              Want to try real BCQs first?
            </span>
            <button
              type="button"
              onClick={() => setShowDemo(true)}
              style={{
                background: 'var(--teal)',
                color: 'white',
                border: 0,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✨ Try 15 Demo BCQs
            </button>
          </div>

          <span className="pill">
            {otpPending ? (
              <>
                <MailCheck size={14} />
                EMAIL VERIFICATION
              </>
            ) : (
              'YOUR STUDY SPACE'
            )}
          </span>

          <h2>
            {otpPending
              ? 'Enter verification code'
              : mode === 'login'
              ? 'Welcome back'
              : mode === 'register'
              ? 'Begin your preparation'
              : mode === 'setup'
              ? 'Set up administrator'
              : mode === 'reset'
              ? 'Choose a new password'
              : 'Reset your password'}
          </h2>

          <p>
            {otpPending
              ? `We sent a 6-digit code from y7087749@gmail.com to ${loginCreds.email}.`
              : mode === 'login'
              ? 'Sign in to continue your preparation.'
              : mode === 'register'
              ? 'Create an account, complete enrollment, and submit your payment proof.'
              : 'Secure access to your account.'}
          </p>

          {message && (
            <div className={`notice ${message.toLowerCase().includes('invalid') || message.toLowerCase().includes('error') ? 'error' : ''}`} role="alert">
              {message}
              {message.includes('new tab') && (
                <div>
                  <a className="text-button" href={typeof window !== 'undefined' ? window.location.origin : '/'} target="_blank" rel="noreferrer">
                    Open MedPrep in a new tab
                  </a>
                </div>
              )}
            </div>
          )}

          {!otpPending && (mode === 'login' || mode === 'register') && (
            <div className="segmented">
              <button
                className={mode === 'login' ? 'selected' : ''}
                onClick={() => {
                  setMode('login');
                  setOtpPending(false);
                  setMessage('');
                }}
              >
                Existing account
              </button>
              <button
                className={mode === 'register' ? 'selected' : ''}
                onClick={() => {
                  setMode('register');
                  setOtpPending(false);
                  setMessage('');
                }}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setShowDemo(true)}
                style={{
                  color: 'var(--teal)',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={14} />
                Demo (15 BCQs)
              </button>
            </div>
          )}

          {otpPending ? (
            <form onSubmit={submit}>
              <label>
                6-digit verification code
                <input
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={{
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: '24px',
                    fontWeight: '700',
                  }}
                />
              </label>

              <button disabled={busy || otpCode.length !== 6} className="btn primary wide">
                {busy ? 'Verifying code…' : 'Verify & Sign in'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                <button type="button" className="text-button" onClick={resendOtp} disabled={busy}>
                  Resend code
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setOtpPending(false);
                    setMessage('');
                    setOtpCode('');
                  }}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={submit}>
              {(mode === 'register' || mode === 'setup') && (
                <>
                  <label>
                    Full name
                    <input name="name" required autoComplete="name" placeholder="Your full name" />
                  </label>
                  <label>
                    Mobile number
                    <input name="mobile" required placeholder="03XX XXXXXXX" />
                  </label>
                </>
              )}
              {mode !== 'reset' && (
                <label>
                  Email address
                  <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
                </label>
              )}
              {mode !== 'forgot' && (
                <label>
                  Password
                  <div className="password">
                    <input
                      name="password"
                      type={show ? 'text' : 'password'}
                      required
                      minLength={mode === 'login' ? 1 : 10}
                      maxLength={128}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? 'Enter your password' : 'At least 10 characters'}
                    />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
              {mode === 'setup' && (
                <label>
                  Administrator setup code
                  <input name="setupToken" type="password" required />
                </label>
              )}
              <button disabled={busy} className="btn primary wide">
                {busy
                  ? mode === 'login'
                    ? 'Checking credentials…'
                    : 'Please wait…'
                  : mode === 'login'
                  ? 'Sign in to MedPrep'
                  : mode === 'register'
                  ? 'Create account'
                  : mode === 'setup'
                  ? 'Create administrator'
                  : mode === 'reset'
                  ? 'Update password'
                  : 'Send reset link'}
              </button>
            </form>
          )}

          {mode === 'login' && !otpPending && (
            <button
              className="text-button"
              onClick={() => {
                setMode('forgot');
                setMessage('');
              }}
            >
              Forgot your password?
            </button>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button className="text-button" onClick={() => setMode('login')}>
              Back to sign in
            </button>
          )}

          <div className="auth-foot">
            <ShieldCheck size={17} />
            Two-factor email verification active via y7087749@gmail.com
          </div>

          {mode === 'login' && !otpPending && (
            <button className="setup-link" onClick={() => setMode('setup')}>
              Administrator setup
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
