import { MongoClient } from 'mongodb';
import { initialize } from './schema.mjs';
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env');
const client = new MongoClient(process.env.MONGODB_URI);
try { await client.connect(); const db=client.db(process.env.MONGODB_DB || 'medprep'); const hello=await db.admin().command({hello:1}); if (!hello.setName && hello.msg!=='isdbgrid') throw new Error('Use MongoDB Atlas or a replica set: payment approval requires transactions.'); await initialize(db); console.log('MongoDB collections, validators and indexes ready.'); } finally { await client.close(); }
