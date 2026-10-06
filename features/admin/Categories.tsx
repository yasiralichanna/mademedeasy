'use client';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Empty } from '../../components/Common';
export default function Categories() { const [items, setItems] = useState<any[]>([]); const [message, setMessage] = useState(''); const load = () => api('questions/categories').then(setItems).catch(e => setMessage(e.message)); useEffect(() => { load(); }, []); async function save(e: any) { e.preventDefault(); try {
    await api('questions/categories', Object.fromEntries(new FormData(e.currentTarget)));
    load();
    setMessage('Academic path saved.');
}
catch (e: any) {
    setMessage(e.message);
} } function path(q: any): string { const parent = items.find(p => p.id === q.parent); return parent ? path(parent) + ' / ' + q.name : q.name; } return <>{message && <div className="notice">{message}</div>}<div className="grid-two"><section className="panel"><h3>Academic structure</h3><p className="subtitle">MBBS year → Subject → Module → Topic</p>{items.filter(i => i.kind === 'topic').length ? items.filter(i => i.kind === 'topic').map(i => <div className="list-row" key={i.id}>{path(i)}</div>) : <Empty title="No academic categories yet" text="Add your first academic path. Saving or importing questions also creates their category paths."/>}</section><section className="panel"><h3 style={{ marginBottom: 20 }}>Add an academic path</h3><form onSubmit={save}><label>MBBS year<select name="year">{[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}</select></label>{['subject', 'module', 'topic'].map(k => <label key={k} style={{ textTransform: 'capitalize' }}>{k}<input name={k} required minLength={2}/></label>)}<button className="btn primary wide">Save academic path</button></form></section></div></>; }
