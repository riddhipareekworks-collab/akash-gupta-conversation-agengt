import { createHmac, timingSafeEqual } from 'node:crypto';

const cookieName = 'aakash_access';
const ttl = 8 * 60 * 60;
function mac(value, secret) { return createHmac('sha256', secret).update(value).digest('base64url'); }
function equal(a, b, secret) { return timingSafeEqual(Buffer.from(mac(a, secret)), Buffer.from(mac(b, secret))); }
function credentialVersion(role, config) {
  return mac(role + ':' + (role === 'admin' ? config.ADMIN_OWNER_EMAIL + ':' + config.ADMIN_PASSWORD : config.TEAM_PASSWORD), config.SESSION_SECRET);
}
export function sessionCookie(role, config, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ role, expires: Math.floor(now / 1000) + ttl,
    version: credentialVersion(role, config) })).toString('base64url');
  return `${cookieName}=${payload}.${mac(payload, config.SESSION_SECRET)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${config.APP_ORIGIN.startsWith('https:') ? '; Secure' : ''}`;
}
export function readSession(request, config, now = Date.now()) {
  try {
    const value = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!value || value.length > 2000) return null;
    const [payload, signature, extra] = value.split('.');
    if (extra || !signature || !equal(signature, mac(payload, config.SESSION_SECRET), config.SESSION_SECRET)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url'));
    if (!['admin', 'team'].includes(session.role) || session.expires <= Math.floor(now / 1000)
      || session.expires > Math.floor(now / 1000) + ttl || session.version !== credentialVersion(session.role, config)) return null;
    if (session.role === 'team' && !config.TEAM_PASSWORD) return null;
    return session;
  } catch { return null; }
}
export function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\r\n]/.test(value) ? value : '/';
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loginPage(next, error = '') {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in | Aakash Gupta</title><style>body{font:17px/1.5 system-ui;background:#f6f2e9;color:#252522;max-width:420px;margin:12vh auto;padding:24px}form{display:grid;gap:16px}input,button{font:inherit;padding:14px;border:1px solid #d9d4ca;border-radius:12px}button{background:#ed482d;color:white;cursor:pointer}label{display:grid;gap:6px}.error{color:#a82e1c}</style><h1>Welcome backstage</h1><p>Sign in to manage agent settings and view saved chats.</p>${error ? `<p class="error" role="alert">${escape(error)}</p>` : ''}<form method="post" action="/login"><input type="hidden" name="next" value="${escape(next)}"><label>Email or username<input name="username" autocomplete="username" maxlength="254" required></label><label>Password<input name="password" type="password" autocomplete="current-password" maxlength="512" required></label><button>Sign in</button></form></html>`, {status: error ? 401 : 200, headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
}

export function createAuth(config, pool) {
  return async function auth(request, ip = 'unknown') {
    const url = new URL(request.url), session = readSession(request, config);
    if (url.pathname === '/logout') {
      if (request.method === 'GET') return { response: new Response('<!doctype html><title>Sign out</title><form method="post"><button>Sign out of this device</button></form>', {headers:{'Content-Type':'text/html','Cache-Control':'no-store'}}) };
      if (request.method !== 'POST' || request.headers.get('origin') !== config.APP_ORIGIN) return {response: new Response('Forbidden', {status:403})};
      return {response: new Response(null, {status:303,headers:{Location:'/','Set-Cookie':`${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${config.APP_ORIGIN.startsWith('https:') ? '; Secure' : ''}`}})};
    }
    if (url.pathname === '/login') {
      if (request.method === 'GET') {
        const next=safeNext(url.searchParams.get('next'));
        // Old homepage sign-in bookmarks should open the site, not a login form.
        if (!/^\/admin(?:\/|$|\?)/.test(next)) return {response:new Response(null,{status:303,headers:{Location:'/','Cache-Control':'no-store'}})};
        if (session?.role==='admin') return {response:new Response(null,{status:303,headers:{Location:next,'Cache-Control':'no-store'}})};
        return {response:loginPage(next)};
      }
      if (request.method !== 'POST' || request.headers.get('origin') !== config.APP_ORIGIN) return {response:new Response('Forbidden',{status:403})};
      // Database-backed throttling survives restarts and multiple Render instances.
      const key = mac(ip, config.SESSION_SECRET);
      const count = await pool.query(`INSERT INTO login_attempts(key,attempts,expires_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.expires_at<now() THEN 1 ELSE login_attempts.attempts+1 END, expires_at=CASE WHEN login_attempts.expires_at<now() THEN now()+interval '15 minutes' ELSE login_attempts.expires_at END RETURNING attempts`, [key]);
      if (count.rows[0].attempts > 10) return {response:new Response('Too many sign-in attempts. Try again in 15 minutes.', {status:429,headers:{'Retry-After':'900'}})};
      const form = await request.formData(), username = String(form.get('username') || '').toLowerCase().trim(), password = String(form.get('password') || ''), next = safeNext(form.get('next'));
      const adminMatch = equal(password, config.ADMIN_PASSWORD, config.SESSION_SECRET);
      const teamMatch = equal(password, config.TEAM_PASSWORD || 'disabled', config.SESSION_SECRET);
      const role = username === config.ADMIN_OWNER_EMAIL.toLowerCase() && adminMatch ? 'admin'
        : username === 'team' && config.TEAM_PASSWORD && teamMatch ? 'team' : null;
      if (!role) return {response:loginPage(next, 'The sign-in details did not match.')};
      await pool.query('DELETE FROM login_attempts WHERE key=$1 OR expires_at<now()', [key]);
      return {response:new Response(null,{status:303,headers:{Location:next,'Set-Cookie':sessionCookie(role,config),'Cache-Control':'no-store'}})};
    }
    const admin = url.pathname === '/admin' || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin/');
    if (admin && session?.role !== 'admin') {
      return {response:url.pathname.startsWith('/api/') ? Response.json({error:'Sign in to access this page.'},{status:session ? 403 : 401})
        : session ? new Response('Admin access required.', {status:403}) : new Response(null,{status:303,headers:{Location:'/login?next='+encodeURIComponent(url.pathname+url.search)}})};
    }
    // Never trust user-supplied Sites identity headers on a publicly reachable Node server.
    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) if (name.startsWith('oai-')) headers.delete(name);
    if (session?.role === 'admin') headers.set('oai-authenticated-user-email',config.ADMIN_OWNER_EMAIL);
    return {request:new Request(request,{headers})};
  };
}
