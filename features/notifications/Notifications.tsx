'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api';
import { Head, Empty, date } from '../../components/Common';
export default function Notifications() { const [items, setItems] = useState<any[]>([]); const [error, setError] = useState(''); const load = () => api('notifications/list').then(setItems).catch(e => setError(e.message)); useEffect(() => { load(); }, []); async function read(id?: string) { try {
    await api('notifications/read', { id });
    load();
}
catch (e: any) {
    setError(e.message);
} } return <><Head title="Notifications" description="Updates about your payment and access." action={<button className="btn" onClick={() => read()}>Mark all as read</button>}/>{error && <div className="notice error">{error}</div>}<section className="panel">{items.length ? items.map(n => <div className="list-row" key={n.id}><div className="row" style={{ alignItems: 'flex-start' }}><Bell size={18} color="var(--teal)"/><span>{n.message}{!n.read && <span className="alert-dot"/>}<small>{date(n.created)}</small></span></div>{!n.read && <button className="btn" onClick={() => read(n.id)}>Mark read</button>}</div>) : <Empty title="You’re all caught up" text="Payment decisions and access updates will appear here."/>}</section></>; }
