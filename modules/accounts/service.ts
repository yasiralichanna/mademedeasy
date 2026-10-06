import { one, rows, count, insert, upsert, remove, bucket, transaction } from '../../db';
import { check } from '../../lib/server/http';
import { verify } from '../../lib/server/crypto';
import { auditStatement } from '../admin/audit';
export async function cleanupProofs() {
 const queued=await rows('settings',{key:{$regex:'^proof_cleanup:'}},{limit:100});
 for(const row of queued) {
  try { await bucket().delete(JSON.parse(row.value).proof); await remove('settings',{key:row.key}).run(); }
  catch { /* Leave the durable cleanup job for an administrator retry. */ }
 }
 return {pending:(await count('settings',{key:{$regex:'^proof_cleanup:'}})).count};
}
export async function deleteStudent(actor:any,studentId:string,password?:string,confirmationEmail?:string) {
 check(typeof studentId==='string','Invalid student account.');
 const self=actor.id===studentId;
 check(self || actor.role==='admin','You cannot remove another account.',403);
 await transaction(async session=>{
  const target=await one('users',{id:studentId},{},session);
  check(target && target.role==='student','Student account not found.',404);
  if(self) check(typeof password==='string' && password.length<=128 && await verify(password,target.password),'Enter your current password to delete your account.',403);
  else check(confirmationEmail===target.email,'Confirmation email does not match the student.',400);
  const proofs=await rows('payments',{user_id:studentId},{},session);
  for(const p of proofs) await upsert('settings',{key:'proof_cleanup:'+p.id},{key:'proof_cleanup:'+p.id,value:JSON.stringify({proof:p.proof})}).run(session);
  for(const name of ['subscriptions','sessions','resets','profiles','bookmarks','notifications','attempts','payments']) await remove(name,{user_id:studentId}).run(session);
  await remove('notifications',{message:target.name+' submitted a payment for review.'}).run(session);
  await remove('users',{id:studentId,role:'student'}).run(session);
  await auditStatement(actor.id,self?'student_account_deleted':'student_removed',studentId,JSON.stringify({type:'account_deletion',actor:{id:actor.id,name:actor.name,role:actor.role},student:{id:target.id,name:target.name},note:self?'Student deleted their own account and associated records.':'Administrator removed the student account and associated records.'})).run(session);
 });
 const cleanup=await cleanupProofs();
 return {deleted:true,pendingProofCleanup:cleanup.pending,message:cleanup.pending?'Account removed. Receipt cleanup is queued for retry.':'Account and associated student data permanently deleted.'};
}
