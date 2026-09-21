import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Only the specifically approved, isolated frontend. Never accept a host override.
const origin = 'https://worthlane-beta-desktop.vercel.app';
const access = '__Host-worthlane-access';
const refresh = '__Host-worthlane-refresh';
const sessions = [];
const check = (condition, message) => assert(condition, message);

async function request(path, jar = new Map(), body, expected = 200, requestOrigin = origin) {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    redirect: 'manual',
    headers: {
      cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
      ...(body === undefined ? {} : { origin: requestOrigin, 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  check(response.status === expected, `${path}: unexpected HTTP ${response.status}`);
  for (const cookie of response.headers.getSetCookie()) {
    const [pair, ...attributes] = cookie.split(';');
    const index = pair.indexOf('=');
    const key = pair.slice(0, index);
    if (![access, refresh, '__Host-worthlane-plaid-oauth'].includes(key)) continue;
    const flags = attributes.map(a => a.trim().toLowerCase());
    check(flags.includes('httponly') && flags.includes('secure') && flags.includes('path=/') && flags.includes('samesite=lax'), 'Session cookie protections missing');
    check(!flags.some(a => a.startsWith('domain=')), 'Host cookie must not have a Domain attribute');
    if (flags.includes('max-age=0')) jar.delete(key);
    else jar.set(key, pair.slice(index + 1));
  }
  return response;
}
async function data(path, jar) { return (await (await request(path, jar)).json()).data; }
function ids(rows) { return rows.map(row => row.id).sort(); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Regression for parallel workspace refresh across separately deployed BFF routes.
check(process.env.WORTHLANE_HOSTED_SANDBOX_APPROVED === 'true', 'Sandbox opt-in required');
const f=JSON.parse(readFileSync('.tmp/hosted-sandbox-fixture.json','utf8'));
check(f.origin==='https://worthlane-beta-sandbox.up.railway.app' && f.email.endsWith('@worthlane.test'), 'Synthetic fixture required');
const jar=new Map();
await request('/api/auth/login',jar,{email:f.email,password:f.password});
jar.delete(access);
const paths=['/api/personal/accounts','/api/household/summary','/api/personal/transactions?limit=1000','/api/debt-plans'];
const copies=paths.map(()=>new Map(jar));
try {
 const result=await Promise.all(paths.map(async(p,i)=>{try{await request(p,copies[i]);return {path:p,status:200,restored:cookiesPresent(copies[i])};}catch(e){return {path:p,error:e instanceof assert.AssertionError?e.message:'request failed'};}}));
 console.log(JSON.stringify(result));
 check(result.every(row=>row.status===200 && row.restored), 'Concurrent expired-session requests must all recover without revoking the session');
} finally {
 for(const j of [jar,...copies]) if(j.has(refresh)) try{await request('/api/auth/logout',j,{});}catch{}
}
function cookiesPresent(j){return j.has(access)&&j.has(refresh);}
