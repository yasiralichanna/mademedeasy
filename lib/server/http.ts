export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export function check(value: any, message: string, status = 400): asserts value { if (!value)
    throw new HttpError(status, message); }
export function now() { return Date.now(); }
export function id() { return crypto.randomUUID(); }
export function json(data: any, status = 200) { return Response.json({ data }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export async function boundary(fn: () => Promise<Response>) { try {
    return await fn();
}
catch (e) {
    if ((e as any)?.code === 11000) return Response.json({ error: { message: 'This record already exists or another request completed first. Refresh and try again.' } }, { status: 409 });
    if (e instanceof SyntaxError)
        return Response.json({ error: { message: 'Invalid JSON or import format. Check your input.' } }, { status: 400 });
    if (e instanceof HttpError)
        return Response.json({ error: { message: e.message } }, { status: e.status });
    console.error('request_failed');
    return Response.json({ error: { message: 'Unable to complete this request. Please try again.' } }, { status: 503 });
} }
export function origin(req: Request) {
    const o = req.headers.get('origin');
    if (!o) return;
    try {
        const originUrl = new URL(o);
        const reqUrl = new URL(req.url);
        if (originUrl.origin === reqUrl.origin) return;
        const reqHost = (req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host') || reqUrl.host).toLowerCase();
        if (originUrl.host.toLowerCase() === reqHost) return;
        if (process.env.RENDER_EXTERNAL_URL && originUrl.host.toLowerCase() === new URL(process.env.RENDER_EXTERNAL_URL).host.toLowerCase()) return;
        check(false, 'Request origin rejected', 403);
    } catch {
        check(false, 'Request origin rejected', 403);
    }
}
