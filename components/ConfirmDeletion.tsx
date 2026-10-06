'use client';
import { useEffect, useRef } from 'react';
import { Modal } from './Common';
export default function ConfirmDeletion({ title, description, label, busy, error, cancel, confirm }: {
 title:string; description:string; label:string; busy:boolean; error:string;
 cancel:()=>void; confirm:()=>void;
}) {
 const cancelButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{cancelButton.current?.focus();},[]);
 useEffect(()=>{function key(e:KeyboardEvent){if(e.key==='Escape'&&!busy)cancel();}document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[busy,cancel]);
 return <Modal title={title} close={()=>{if(!busy)cancel();}}><p>{description}</p><p><strong>This cannot be undone.</strong></p>{error && <div className="notice error" role="alert">{error}</div>}<div className="form-actions"><button ref={cancelButton} type="button" className="btn" onClick={cancel} disabled={busy}>Cancel</button><button type="button" className="btn" style={{background:'#b91c1c',borderColor:'#b91c1c',color:'#fff'}} onClick={confirm} disabled={busy}>{busy?'Deleting…':label}</button></div></Modal>;
}
