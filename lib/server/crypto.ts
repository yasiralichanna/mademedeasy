import { check } from './http';
const encoder = new TextEncoder();
export function hex(b: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(b)).map(v => v.toString(16).padStart(2, '0')).join(''); }
export function bytes(s: string) { return Uint8Array.from(s.match(/../g) ?? [], h => parseInt(h, 16)); }
export function secret(name: string) { return process.env[name] as string | undefined; }
export async function digest(s: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(s))); }
export async function passwordHash(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) { const k = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); return salt + ':' + hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, k, 256)); }
export function equal(a: string, b: string) { let n = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++)
    n |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return n === 0; }
export async function verify(password: string, stored: string) { return equal(await passwordHash(password, stored.split(':')[0]), stored); }
async function cnicKey() { const key = secret('CNIC_KEY'); check(key && /^[a-f0-9]{64}$/i.test(key), 'Enrollment is temporarily unavailable. Please contact the administrator.', 503); return crypto.subtle.importKey('raw', bytes(key!), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
export async function encrypt(s: string) { const iv = crypto.getRandomValues(new Uint8Array(12)); return hex(iv) + ':' + hex(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cnicKey(), encoder.encode(s))); }
export async function decrypt(s: string) { const [iv, c] = s.split(':'); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv) }, await cnicKey(), bytes(c))); }
