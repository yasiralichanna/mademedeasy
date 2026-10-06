import { MongoClient, type ClientSession } from 'mongodb';
import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
let connection: Promise<MongoClient> | undefined;
export async function client() {
  if (!connection) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is required');
    connection = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }).connect().catch(e => { connection = undefined; throw e; });
  }
  return connection;
}
export async function collection(name: string) { return (await client()).db(process.env.MONGODB_DB || 'medprep').collection<any>(name); }
export async function one(name: string, filter: any = {}, options: any = {}, session?: ClientSession): Promise<any> { return (await collection(name)).findOne(filter, { projection: { _id: 0 }, ...options, session }); }
export async function rows(name: string, filter: any = {}, options: any = {}, session?: ClientSession): Promise<any[]> { return (await collection(name)).find(filter, { projection: { _id: 0 }, ...options, session }).toArray(); }
export async function count(name: string, filter: any = {}) { return { count: await (await collection(name)).countDocuments(filter) }; }
export type Operation = { run: (session?: ClientSession) => Promise<any> };
export function insert(name: string, doc: any, ignore = false): Operation { return { async run(session) { const c = await collection(name); if (ignore) { const filter = name === 'bookmarks' ? { user_id: doc.user_id, question_id: doc.question_id } : { id: doc.id }; const r = await c.updateOne(filter, { $setOnInsert: doc }, { upsert: true, session }); return { meta: { changes: r.upsertedCount } }; } const r = await c.insertOne({ ...doc }, { session }); return { meta: { changes: r.acknowledged ? 1 : 0 } }; } }; }
export function upsert(name: string, filter: any, doc: any): Operation { return { async run(session) { const r = await (await collection(name)).updateOne(filter, { $set: doc }, { upsert: true, session }); return { meta: { changes: r.modifiedCount + r.upsertedCount } }; } }; }
export function update(name: string, filter: any, patch: any): Operation { return { async run(session) { const r = await (await collection(name)).updateMany(filter, { $set: patch }, { session }); return { meta: { changes: r.modifiedCount } }; } }; }
export function remove(name: string, filter: any): Operation { return { async run(session) { const r = await (await collection(name)).deleteMany(filter, { session }); return { meta: { changes: r.deletedCount } }; } }; }
export async function transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> { const s = (await client()).startSession(); try { return (await s.withTransaction(() => fn(s)))!; } finally { await s.endSession(); } }
export function database() { return { async batch(ops: Operation[]) { return transaction(async session => { const out = []; for (const op of ops) out.push(await op.run(session)); return out; }); } }; }
// Proof files stay outside public/. A persistent private volume is required in production.
function proofPath(key: string) { if (!/^proofs\/[a-f0-9-]+\/[a-f0-9-]+$/.test(key)) throw new Error('Invalid proof key'); const root = resolve(/* turbopackIgnore: true */ process.env.PROOF_STORAGE_DIR || './private-uploads'); return resolve(root, key); }
export function bucket() { return {
  async put(key: string, bytes: Uint8Array, _options?: any) { const path = proofPath(key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { mode: 0o600 }); },
  async get(key: string) { try { const data = await readFile(/* turbopackIgnore: true */ proofPath(key)); return { body: new Uint8Array(data) }; } catch (e: any) { if (e.code === 'ENOENT') return null; throw e; } },
  async delete(key: string) { await unlink(proofPath(key)).catch((e: any) => { if (e.code !== 'ENOENT') throw e; }); }
}; }
