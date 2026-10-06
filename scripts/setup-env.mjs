import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const example=await readFile(new URL('../.env.example',import.meta.url),'utf8');
const text=example.replace('REPLACE_WITH_64_HEX_CHARACTERS',randomBytes(32).toString('hex')).replace('REPLACE_WITH_RANDOM_SECRET',randomBytes(32).toString('hex'));
try{await writeFile('.env',text,{flag:'wx',mode:0o600});console.log('Created .env with fresh local secrets. Edit MONGODB_URI if using Atlas.');}catch(e){if(e.code==='EEXIST')console.log('.env already exists; preserved your settings.');else throw e;}
