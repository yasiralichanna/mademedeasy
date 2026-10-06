import assert from 'node:assert/strict';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialize } from '../scripts/schema.mjs';
const repl=await MongoMemoryReplSet.create({replSet:{count:1,args:['--nounixsocket']},binary:{version:'7.0.24'}});
const uploads=await mkdtemp(join(tmpdir(),'medprep-proofs-'));
process.env.MONGODB_URI=repl.getUri();process.env.MONGODB_DB='medprep_test';process.env.CNIC_KEY=randomBytes(32).toString('hex');process.env.ADMIN_SETUP_TOKEN=randomBytes(24).toString('hex');process.env.PROOF_STORAGE_DIR=uploads;process.env.TRUST_PROXY='1';
const db=await import('../db');
const {GET,POST}=await import('../app/api/[module]/[action]/route');
let cookie='';let requestNumber=0;
async function call(path:string,p?:any){const [route,query='']=path.split('?');const [module,action]=route.split('/');const headers:any={'x-forwarded-for':'test-'+(++requestNumber),...(cookie?{cookie}:{})};let body:any;if(p instanceof FormData)body=p;else if(p!==undefined){headers['Content-Type']='application/json';body=JSON.stringify(p)}const req=new Request('http://localhost/api/'+route+(query?'?'+query:''),{method:p===undefined?'GET':'POST',headers,body});return (p===undefined?GET:POST)(req,{params:Promise.resolve({module,action})});}
async function data(path:string,p?:any,expected=200){const r=await call(path,p);assert.equal(r.status,expected,await r.clone().text());return (await r.json()).data;}
async function login(email:string){const r=await call('auth/login',{email,password:'Testing12345'});assert.equal(r.status,200,await r.clone().text());cookie=r.headers.get('set-cookie')!;assert.ok(cookie.includes('HttpOnly'));}
function proof(reference:string){const f=new FormData();Object.entries({package_id:'test-package',method:'JazzCash',reference,amount:'1000',paid_date:new Date().toISOString().slice(0,10)}).forEach(([k,v])=>f.set(k,v));f.set('proof',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkWQAAAAASUVORK5CYII=','base64')],'proof.png',{type:'image/png'}));return f;}
try{
 await initialize((await db.client()).db('medprep_test'));
 await data('auth/setup',{email:'admin@example.test',name:'Administrator',mobile:'03001234567',password:'Testing12345',setupToken:process.env.ADMIN_SETUP_TOKEN},201);
 await login('admin@example.test');const adminCookie=cookie;assert.equal((await data('auth/me')).user.role,'admin');await data('profiles/profile',undefined,403);await data('analytics/dashboard',undefined,403);await data('attempts/list',undefined,403);await data('payments/list',undefined,403);
 const w=await readFile('components/Workspace.tsx','utf8');assert.ok(w.includes("useState(user.role === 'admin' ? 'admin' : 'dashboard')"));assert.ok(w.includes("user.role === 'admin' ? [['admin', 'Admin dashboard', ShieldCheck]]"));assert.ok(w.includes("if (user.role === 'student') api('profiles/profile')"));
 await data('packages/list',{id:'test-package',name:'Testing package',description:'Test only',price:100000,days:30,scope:{years:[1],subjects:[],modules:[]},active:true});
 await data('packages/accounts',{name:'JazzCash',title:'Test only',number:'03001234567',enabled:true});
 const q={stem:'DEMONSTRATION ONLY: Which option is B?',options:['A','B','C','D'],correct:1,explanation:'Development check only.',incorrect:{},year:1,subject:'Demo',module:'Checks',topic:'Interface',difficulty:'easy',tags:['demo'],source:'Nonmedical test',status:'published'};
 await data('questions/save',q);const qs=await data('questions/admin');assert.equal(qs.length,1);const qid=qs[0].id;
 await data('questions/save',{...q,id:qid,explanation:'Updated explanation'});
 const csv=await (await call('questions/template?format=csv')).text();assert.equal((await data('questions/import',{format:'csv',text:csv})).invalid,0);
 await data('questions/import',{text:JSON.stringify([{...q,stem:'Another demonstration'}]),commit:true});assert.equal((await data('questions/admin')).filter((q:any)=>q.status==='draft').length,1);
 cookie='';await data('auth/register',{email:'student@example.test',name:'Test Student',mobile:'03001234567',password:'Testing12345',role:'admin'},201);await login('student@example.test');const studentCookie=cookie;assert.equal((await data('auth/me')).user.role,'student');
 assert.equal((await call('admin/students')).status,403);assert.equal((await call('questions/catalog')).status,403);
 await data('profiles/profile',{cnic:'12345-1234567-1',college:'Test College',year:1});assert.equal((await data('profiles/profile')).cnic,'*****-*******-1');
 await data('payments/submit',proof('REFERENCE1'),201);await data('payments/submit',proof('REFERENCE2'),409);const payment=(await data('payments/list'))[0];assert.equal((await data('access/status')).state,'pending');assert.equal((await call('payments/proof?id='+payment.id)).status,200);
 cookie=adminCookie;await data('payments/review',{id:payment.id,status:'rejected',reason:'Receipt unreadable'});cookie=studentCookie;assert.equal((await data('access/status')).state,'rejected');await data('payments/submit',proof('REFERENCE2'),201);const next=(await data('payments/list')).find((p:any)=>p.status==='pending');
 cookie=adminCookie;const review=await Promise.all([call('payments/review',{id:next.id,status:'approved'}),call('payments/review',{id:next.id,status:'approved'})]);assert.ok(review.every(r=>r.status===200));const subs=await data('access/list');assert.equal(subs.length,1);assert.equal((await db.count('audit',{action:'payment_approved'})).count,1);
 cookie=studentCookie;assert.equal((await data('access/status')).state,'active');assert.equal((await data('questions/catalog'))[0].count,1);
 const attempt=await data('attempts/start',{mode:'practice',year:1,count:1},201);const before=await data('attempts/get?id='+attempt.id);assert.equal(before.items[0].correct,undefined);await data('attempts/answer',{id:attempt.id,question_id:qid,choice:1});await data('attempts/answer',{id:attempt.id,question_id:qid,choice:0},409);const done=await data('attempts/finish',{id:attempt.id});assert.equal(done.result.percentage,100);
 await data('attempts/bookmark',{question_id:qid,saved:true});await data('attempts/bookmark',{question_id:qid,saved:true});assert.equal((await data('attempts/revision?mode=bookmarks')).length,1);assert.equal((await data('analytics/dashboard')).stats.bookmarks,1);
 const exam=await data('attempts/start',{mode:'final',year:1,count:1,minutes:1,distribution:{Demo:1}},201);let e=await data('attempts/get?id='+exam.id);assert.equal((await data('attempts/get?id='+exam.id)).deadline,e.deadline);await data('attempts/flags',{id:exam.id,flags:[qid]});await data('attempts/answer',{id:exam.id,question_id:qid,choice:1});assert.equal((await data('analytics/dashboard')).stats.answered,1);await db.update('attempts',{id:exam.id},{deadline:Date.now()-1,created:Date.now()-60001}).run();e=await data('attempts/get?id='+exam.id);assert.ok(e.finished);await data('attempts/answer',{id:exam.id,question_id:qid,choice:0},409);assert.equal((await data('analytics/dashboard')).stats.answered,2);
 await data('notifications/read',{});assert.ok((await data('notifications/list')).every((n:any)=>n.read===1));
 cookie=adminCookie;const students=await data('admin/students');assert.equal(students.length,1);assert.equal(students[0].password,undefined);assert.equal((await data('admin/cnic',{user_id:students[0].id})).cnic,'1234512345671');const reset=await data('admin/reset',{user_id:students[0].id});
 await data('access/update',{id:subs[0].id,status:'suspended',starts:subs[0].starts,expires:subs[0].expires});cookie=studentCookie;await data('questions/catalog',undefined,403);cookie=adminCookie;await data('access/update',{id:subs[0].id,status:'active',starts:Date.now()-10000,expires:Date.now()-1});cookie=studentCookie;assert.equal((await data('access/status')).state,'expired');await data('profiles/profile');
 cookie='';await data('auth/register',{email:'outside@example.test',name:'Outside Student',mobile:'03001234567',password:'Testing12345'},201);await login('outside@example.test');const outsideCookie=cookie;await data('payments/proof?id='+next.id,undefined,404);await data('payments/review',{id:next.id,status:'approved'},403);await data('payments/review',{id:{$ne:null},status:'approved'},403);
 const token=new URL(reset.url).searchParams.get('reset');await data('auth/reset',{token,password:'Replacement12345'});await data('auth/reset',{token,password:'Replacement12345'},400);cookie=studentCookie;assert.equal((await data('auth/me')).user,null);

 // Removing an account invalidates sessions and removes all student-owned data and private receipts.
 cookie=outsideCookie;
 await data('admin/remove',{user_id:students[0].id,confirmEmail:'student@example.test'},403);
 cookie=adminCookie;
 await data('admin/remove',{user_id:(await data('auth/me')).user.id,confirmEmail:'admin@example.test'},404);
 await data('admin/remove',{user_id:students[0].id,confirmEmail:'wrong@example.test'},400);
 const removed=await data('admin/remove',{user_id:students[0].id,confirmEmail:'student@example.test'});assert.equal(removed.pendingProofCleanup,0);
 assert.equal(await db.one('users',{id:students[0].id}),null);
 for(const name of ['profiles','payments','subscriptions','attempts','bookmarks','sessions','resets','notifications']) assert.equal((await db.count(name,{user_id:students[0].id})).count,0,name);
 await assert.rejects(readFile(join(uploads,next.proof)));
 cookie=studentCookie;assert.equal((await data('auth/me')).user,null);
 cookie=outsideCookie;await data('profiles/delete',{password:'WrongPassword'},403);
 await data('profiles/delete',{password:'Testing12345'});assert.equal((await data('auth/me')).user,null);
 cookie=adminCookie;const audits=await data('admin/audit');const removedAudit=audits.find((a:any)=>a.action==='student_removed');assert.equal(removedAudit.target_name,'Test Student');assert.equal(removedAudit.actor_name,'Administrator');const selfAudit=audits.find((a:any)=>a.action==='student_account_deleted');assert.equal(selfAudit.actor_name,'Outside Student');assert.equal(selfAudit.target_name,'Outside Student');assert.equal(selfAudit.actor_role,'student');assert.ok(selfAudit.detail.includes('own account'));
 await data('auth/logout',{});assert.equal((await data('auth/me')).user,null);

 console.log('PASS: MongoDB replica-set workflow, admin workspace separation, roles, enrollment encryption, private proof ownership, rejection/resubmission, concurrent approval idempotency, question imports, practice/exams, deadlines, analytics, notifications, expiry/suspension single-use resets, password-confirmed self-deletion and administrator removal with private receipt cleanup.');
}finally{await (await db.client()).close();await repl.stop();await rm(uploads,{recursive:true,force:true});}
