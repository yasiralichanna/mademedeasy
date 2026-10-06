export function auditView(row:any) {
 let snapshot:any=null;
 try { const parsed=JSON.parse(row.detail); if(parsed?.type==='account_deletion')snapshot=parsed; } catch {}
 return {...row,actor_name:row.actor_name || snapshot?.actor?.name || null,actor_role:row.actor_role || snapshot?.actor?.role || null,target_name:row.target_name || snapshot?.student?.name || null,detail:snapshot?.note || row.detail};
}
