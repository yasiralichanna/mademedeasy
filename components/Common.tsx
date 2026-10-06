'use client';
import { X, BookOpen } from 'lucide-react';
export function Empty({ title, text, action }: {
    title: string;
    text: string;
    action?: any;
}) { return <div className="empty"><BookOpen /><strong>{title}</strong>{text}{action}</div>; }
export function Head({ title, description, action }: {
    title: string;
    description?: string;
    action?: any;
}) { return <div className="page-head"><div><div className="breadcrumb">MEDPREP / YOUR WORKSPACE</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>; }
export function Modal({ title, children, close }: {
    title: string;
    children: any;
    close: () => void;
}) { return <div className="modal-backdrop" onClick={close}><section role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e => e.stopPropagation()}><div className="panel-head"><h2>{title}</h2><button className="icon-btn" aria-label="Close" onClick={close}><X size={19}/></button></div>{children}</section></div>; }
export function Status({ value }: {
    value: string;
}) { return <span className={'pill ' + value}>{value.replace(/_/g, ' ').toUpperCase()}</span>; }
export const date = (v: number) => new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
export const money = (v: number) => 'Rs ' + (v / 100).toLocaleString('en-PK');
