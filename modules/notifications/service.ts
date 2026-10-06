import { one, rows, count, insert, upsert, update, remove, database, bucket, transaction, collection } from '../../db';
import { id, now } from '../../lib/server/http';
export function notification(user: string, message: string) { return insert('notifications', { id: id(), user_id: user, message: message, created: now(), read: 0 }); }
