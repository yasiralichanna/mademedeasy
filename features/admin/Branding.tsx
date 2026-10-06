'use client';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function Branding() { const [data, setData] = useState<any>(null); const [message, setMessage] = useState(''); useEffect(() => { api('admin/branding').then(setData).catch(e => setMessage(e.message)); }, []); async function save(e: any) { e.preventDefault(); try {
    const d = await api('admin/branding', Object.fromEntries(new FormData(e.currentTarget)));
    setMessage(d.message);
}
catch (e: any) {
    setMessage(e.message);
} } return <section className="panel"><h3 style={{ marginBottom: 20 }}>Platform branding</h3>{message && <div className="notice">{message}</div>}{data && <form onSubmit={save} style={{ maxWidth: 600 }}><label>Brand name<input name="name" defaultValue={data.name} maxLength={25} required/></label><label>Brand suffix<input name="suffix" defaultValue={data.suffix} maxLength={12}/></label><label>Support page URL (optional)<input name="support" type="url" defaultValue={data.support} placeholder="https://…"/></label><button className="btn primary">Save branding</button></form>}</section>; }
