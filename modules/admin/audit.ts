import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { id, now } from '../../lib/server/http';
export function auditStatement(actor: string, action: string, target: string, detail = '') { return insert('audit', { id: id(), actor: actor, action: action, target: target, detail: detail, created: now() }); }
export async function record(actor: string, action: string, target: string, detail = '') { await auditStatement(actor, action, target, detail).run(); }
