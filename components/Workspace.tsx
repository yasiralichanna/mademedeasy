'use client';

import { useEffect, useState } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Timer,
  Bookmark,
  Target,
  ChartNoAxesCombined,
  CreditCard,
  UserRound,
  Bell,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../features/api';
import Dashboard from '../features/dashboard/Dashboard';
import Admin from '../features/admin/Admin';
import Results from '../features/dashboard/Results';
import Notifications from '../features/notifications/Notifications';
import Start from '../features/attempts/Start';
import Attempt from '../features/attempts/Attempt';
import Payments from '../features/payments/Payments';
import Profile from '../features/profiles/Profile';

export default function Workspace({ user, logout }: { user: any; logout: () => void }) {
  const [page, setPage] = useState(user.role === 'admin' ? 'admin' : 'dashboard');
  const [mobile, setMobile] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError('');
    try {
      await api('auth/logout', {});
      await logout();
    } catch (error: any) {
      setError(error.message || 'Unable to log out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  const reload = () => {
    // Refresh user state (such as avatar updates)
    api('auth/me')
      .then((d: any) => {
        if (d?.user) {
          user.avatar = d.user.avatar;
        }
      })
      .catch(() => {});

    return api(user.role === 'admin' ? 'admin/branding' : 'analytics/dashboard')
      .then((d) => setData(user.role === 'admin' ? { branding: d } : d))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (user.role === 'student') {
      api('profiles/profile')
        .then((p) => {
          if (!p && user.role === 'student') setPage('profile');
        })
        .catch((e) => setError(e.message));
    }
    reload();
  }, []);

  const navigate = (s: string) => {
    if (user.role === 'admin' && !['admin', 'notifications', 'profile'].includes(s)) return;
    if (s === 'exams') s = 'practice';
    setPage(s);
    setMobile(false);
    setError('');
  };

  const nav =
    user.role === 'admin'
      ? [
          ['admin', 'Admin dashboard', ShieldCheck],
          ['profile', 'My profile', UserRound],
        ]
      : [
          ['dashboard', 'Overview', LayoutDashboard],
          ['practice', 'Practice BCQs', BookOpen],
          ['bookmarks', 'Bookmarks', Bookmark],
          ['incorrect', 'Revise mistakes', Target],
          ['results', 'Results & progress', ChartNoAxesCombined],
          ['payments', 'Payment & access', CreditCard],
          ['profile', 'My profile', UserRound],
        ];

  return (
    <div className="shell">
      <aside className={'sidebar ' + (mobile ? 'open' : '')}>
        <a className="brand" href="/">
          <span className="brand-icon">
            <GraduationCap size={24} />
          </span>
          {data?.branding?.name || 'MedPrep'}
          <span className="brand-suffix">{data?.branding?.suffix || 'BCQs'}</span>
        </a>
        <div className="nav-label">{user.role === 'admin' ? 'PLATFORM MANAGEMENT' : 'YOUR PREPARATION'}</div>
        <nav className="nav">
          {nav.map(([key, label, Icon]: any) => (
            <button key={key} className={page === key ? 'active' : ''} onClick={() => navigate(key)}>
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {data?.branding?.support && (
            <a className="text-button" href={data.branding.support} target="_blank" rel="noreferrer">
              Contact support
            </a>
          )}
          <div className="user-chip">
            <span className="avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name
                  .split(' ')
                  .map((s: string) => s[0])
                  .slice(0, 2)
                  .join('')
              )}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Administrator' : 'MBBS student'}</small>
            </span>
          </div>
          <button className="signout" type="button" disabled={loggingOut} onClick={signOut}>
            <LogOut size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn mobile-menu" aria-label="Toggle navigation" onClick={() => setMobile(!mobile)}>
            <Menu size={20} />
          </button>
          <span>{user.role === 'admin' ? 'Administrator workspace' : 'Learn with purpose. Prepare with confidence.'}</span>
          <div className="top-actions">
            <span className="pill">{user.role === 'admin' ? 'ADMINISTRATOR' : 'MBBS PREPARATION'}</span>
            <button className="icon-btn" aria-label="Notifications" onClick={() => navigate('notifications')}>
              <Bell size={19} />
            </button>
            <span className="avatar" onClick={() => navigate('profile')} style={{ cursor: 'pointer' }} title="My profile">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name[0]
              )}
            </span>
            <button type="button" className="btn header-logout" onClick={signOut} disabled={loggingOut}>
              <LogOut size={16} />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </header>

        <main className="content">
          {error && <div className="notice error">{error}</div>}
          {page === 'results' && <Results navigate={navigate} />}
          {page === 'notifications' && <Notifications />}
          {user.role === 'student' && page === 'dashboard' && <Dashboard user={user} data={data} navigate={navigate} />}
          {user.role === 'student' && ['practice', 'bookmarks', 'incorrect'].includes(page) && (
            <Start key={page} mode={page} user={user} navigate={navigate} />
          )}
          {page.startsWith('attempt:') && <Attempt key={page} id={page.slice(8)} navigate={navigate} refresh={reload} />}
          {user.role === 'student' && page === 'payments' && <Payments refresh={reload} />}
          {page === 'admin' && user.role === 'admin' && <Admin />}
          {page === 'profile' && <Profile user={user} refresh={reload} onDeleted={logout} />}
        </main>
      </div>
    </div>
  );
}
