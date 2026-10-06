import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { MongoClient } from 'mongodb';

let mongodPath = 'mongod';
const baseServerDir = 'C:\\Program Files\\MongoDB\\Server';
if (existsSync(baseServerDir)) {
  const versions = readdirSync(baseServerDir);
  if (versions.length > 0) {
    const candidate = join(baseServerDir, versions[versions.length - 1], 'bin', 'mongod.exe');
    if (existsSync(candidate)) {
      mongodPath = candidate;
    }
  }
}

const dataDir = process.env.LOCALAPPDATA 
  ? join(process.env.LOCALAPPDATA, 'MedPrep-MongoData')
  : join(homedir(), '.medprep-mongodata');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

async function isReplicaRunning() {
  try {
    const client = new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true&serverSelectionTimeoutMS=2000');
    await client.connect();
    const res = await client.db('admin').command({ ping: 1 });
    await client.close();
    return res.ok === 1;
  } catch {
    return false;
  }
}

if (await isReplicaRunning()) {
  console.log('MongoDB replica set is already running on port 27018.');
} else {
  console.log(`Starting mongod replica node on port 27018 using ${dataDir}...`);
  const proc = spawn(mongodPath, ['--dbpath', dataDir, '--port', '27018', '--replSet', 'rs0', '--bind_ip', '127.0.0.1'], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const client = new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true&serverSelectionTimeoutMS=1000');
      await client.connect();
      try {
        await client.db('admin').command({
          replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27018' }] }
        });
      } catch (e) {
        // ignore if already initiated
      }
      await client.close();
      console.log('MongoDB replica set rs0 is ready on port 27018.');
      break;
    } catch {}
  }
}
