'use client';
import { useEffect, useState } from 'react';
import Auth from '../features/auth/Auth';
import Workspace from '../components/Workspace';
export default function Page() { const [user, setUser] = useState<any>(undefined); const [error, setError] = useState(''); const load = () => fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }).then(r => r.json()).then((d: any) => { if (d.error)
    throw Error(d.error.message); setUser(d.data.user); return !!d.data.user; }).catch(e => { setError(e.message); return false; }); useEffect(() => { load(); }, []); if (error)
    return <main className="loading"><h2>Unable to load your workspace</h2><p>{error}</p><button className="btn" onClick={() => { setError(''); load(); }}>Try again</button></main>; if (user === undefined)
    return <div className="loading">Opening your study space…</div>; if (!user)
    return <Auth reload={load}/>; return <Workspace key={user.id} user={user} logout={load}/>; }
