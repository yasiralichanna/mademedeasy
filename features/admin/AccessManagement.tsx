'use client';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Empty, Modal, Status, date } from '../../components/Common';
export default function AccessManagement() { const [items, setItems] = useState<any[]>([]); const [edit, setEdit] = useState<any>(null); const [message, setMessage] = useState(''); const load = () => api('access/list').then(setItems).catch(e => setMessage(e.message)); useEffect(() => { load(); }, []); async function save(e: any) { e.preventDefault(); try {
    const p: any = Object.fromEntries(new FormData(e.currentTarget));
    await api('access/update', { ...p, id: edit.id, starts: Date.parse(p.starts), expires: Date.parse(p.expires) });
    setEdit(null);
    setMessage('Access updated.');
    load();
}
catch (e: any) {
    setMessage(e.message);
} } return <>{message && <div className="notice">{message}</div>}<section className="panel"><div className="panel-head"><h3>Student subscriptions</h3></div>{items.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Start</th><th>Expiry</th><th>Status</th><th /></tr></thead><tbody>{items.map(s => <tr key={s.id}><td><strong>{s.name}</strong><small style={{ display: 'block' }}>{s.email}</small></td><td>{date(s.starts)}</td><td>{date(s.expires)}</td><td><Status value={s.status === 'active' && s.expires < Date.now() ? 'expired' : s.status}/></td><td><button className="btn" onClick={() => setEdit(s)}>Manage access</button></td></tr>)}</tbody></table></div> : <Empty title="No active subscriptions yet" text="Approving a payment creates its subscription here."/>}</section>{edit && <Modal title={'Access for ' + edit.name} close={() => setEdit(null)}><form onSubmit={save}><label>Status<select name="status" defaultValue={edit.status}><option value="active">Active</option><option value="suspended">Suspended</option></select></label><label>Access start<input name="starts" type="datetime-local" defaultValue={new Date(edit.starts - new Date(edit.starts).getTimezoneOffset() * 60000).toISOString().slice(0, 16)} required/></label><label>Access expiry<input name="expires" type="datetime-local" defaultValue={new Date(edit.expires - new Date(edit.expires).getTimezoneOffset() * 60000).toISOString().slice(0, 16)} required/></label><div className="notice">Dates use your browser's local timezone. To extend access, set a later expiry. Reactivating expired access also requires a future expiry.</div><button className="btn primary wide">Save access</button></form></Modal>}</>; }
