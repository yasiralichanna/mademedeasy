import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { requireUser } from '../auth/service';
import { activation } from '../access/service';
import { auditStatement } from '../admin/audit';
import { notification } from '../notifications/service';
import { check, json, id, now } from '../../lib/server/http';
export async function handle(action: string, req: Request) { const u = await requireUser(req, ['review', 'admin'].includes(action)); if (['submit', 'list'].includes(action)) check(u.role === 'student', 'This workflow is for student accounts.', 403); if (action === 'list' || action === 'admin')
    return json(action === 'admin' ? await Promise.all((await rows('payments',{}, {sort:{created:-1}})).map(async p=>{ const user=await one('users',{id:p.user_id}); const ref=p.reference.toLowerCase(); const dup=(await rows('payments',{method:p.method})).filter(d=>d.reference.toLowerCase()===ref).length; return {...p,name:user?.name,email:user?.email,duplicates:dup}; })) : await rows('payments',{user_id:u.id},{sort:{created:-1}})); if (action === 'submit') {
    check(await one('profiles', { "user_id": u.id }, { projection: { _id: 0, user_id: 1 } }), 'Complete enrollment before submitting payment.');
    const p = await req.formData();
    const pkg = await one('packages', { "id": String(p.get('package_id') || ''), "active": 1 });
    check(pkg, 'Selected package is unavailable.');
    check(!await one('payments', { "user_id": u.id, "status": "pending" }, { projection: { _id: 0, id: 1 } }), 'You already have a pending submission.', 409);
    const method = String(p.get('method') || '');
    const accounts = await one('settings', { "key": "payment_accounts" }, { projection: { _id: 0, value: 1 } });
    const acct = accounts ? JSON.parse(accounts.value)[method] : null;
    check(acct?.enabled && acct.title && acct.number, 'This payment method is unavailable.');
    const reference = String(p.get('reference') || '').trim();
    check(reference.length >= 4 && reference.length <= 100, 'Enter the transaction reference number.');
    const amount = Math.round(Number(p.get('amount')) * 100);
    check(Number.isFinite(amount) && amount === pkg.price, 'Amount paid must match the package price.');
    const paidDate = String(p.get('paid_date') || '');
    check(/^\d{4}-\d{2}-\d{2}$/.test(paidDate) && Number.isFinite(Date.parse(paidDate)) && Date.parse(paidDate) <= now() + 86400000, 'Enter a valid payment date.');
    const file = p.get('proof');
    check(file instanceof File && file.size > 0 && file.size <= 5 * 1024 * 1024, 'Upload a JPG, PNG or PDF up to 5 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
    const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : pdf ? 'application/pdf' : '';
    check(mime && file.type === mime, 'File contents must match JPG, PNG or PDF type.');
    const pid = id(), proof = 'proofs/' + u.id + '/' + pid;
    await bucket().put(proof, bytes, { httpMetadata: { contentType: mime } });
    try {
        await database().batch([insert('payments',{id:pid,user_id:u.id,package_id:pkg.id,snapshot:JSON.stringify({...pkg,scope:JSON.parse(pkg.scope)}),method,reference,amount,paid_date:paidDate,proof,mime,status:'pending',created:now()}), notification(u.id, 'Your payment proof has been submitted. Please wait for administrator review.'), ...(await rows('users', { "role": "admin" }, { projection: { _id: 0, id: 1 } })).map(admin => notification(admin.id, u.name + ' submitted a payment for review.'))]);
        const saved = await one('payments', { "id": pid }, { projection: { _id: 0, id: 1 } });
        if (!saved) {
            await bucket().delete(proof);
            check(false, 'A pending submission already exists.', 409);
        }
    }
    catch (e) {
        await bucket().delete(proof);
        throw e;
    }
    return json({ message: 'Your payment proof has been submitted successfully. Please wait while the administrator verifies your payment. Your BCQ access will be activated after approval.' }, 201);
} if (action === 'proof') {
    const pid = new URL(req.url).searchParams.get('id');
    const p = await one('payments', { "id": pid });
    check(p && (p.user_id === u.id || u.role === 'admin'), 'Proof not found', 404);
    const f = await bucket().get(p.proof);
    check(f, 'Proof unavailable', 404);
    return new Response(f.body, { headers: { 'Content-Type': p.mime, 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline; filename="payment-proof.' + (p.mime === 'application/pdf' ? 'pdf' : p.mime === 'image/png' ? 'png' : 'jpg') + '"' } });
} if (action === 'review') {
    const p: any = await req.json(); for(const field of ['id','user_id','question_id','email','token']) if(p[field]!==undefined) check(typeof p[field]==='string','Invalid '+field+'.');
    const payment = await one('payments', { "id": p.id });
    check(payment, 'Payment not found', 404);
    check(['approved', 'rejected'].includes(p.status), 'Invalid decision.');
    if (payment.status === p.status)
        return json({ message: 'Decision already saved.' });
    check(payment.status === 'pending', 'This payment has already been reviewed.', 409);
    check(p.status !== 'rejected' || String(p.reason || '').trim().length >= 5, 'Provide a rejection reason.');
    await transaction(async session => {
      const latest=await one('payments',{id:p.id},{},session);
      check(latest,'Payment not found',404);
      if(latest.status===p.status) return;
      check(latest.status==='pending','Payment has already been reviewed.',409);
      const decisionAt=now();
      const changed=await update('payments',{id:p.id,status:'pending'},{status:p.status,reason:p.status==='rejected'?p.reason.trim():null,reviewer:u.id,reviewed:decisionAt}).run(session);
      check(changed.meta.changes===1,'Payment changed. Refresh and try again.',409);
      if(p.status==='approved') {
        const starts=p.starts?Number(p.starts):now();
        const expires=p.expires?Number(p.expires):starts+JSON.parse(latest.snapshot).days*86400000;
        check(Number.isFinite(starts)&&Number.isFinite(expires)&&expires>starts,'Expiry must follow start.');
        await activation(latest,starts,expires).run(session);
      }
      await auditStatement(u.id,'payment_'+p.status,p.id).run(session);
      await notification(latest.user_id,p.status==='approved'?'Your payment was approved. Your BCQ access has been activated.':'Your payment was rejected: '+p.reason.trim()).run(session);
    });
    return json({ message: p.status === 'approved' ? 'Payment approved and access activated.' : 'Payment rejected. The student can submit corrected proof.' });
} check(false, 'Route not found', 404); }
