import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
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
 // Concurrent ordinary requests must reject expiry WITHOUT consuming refresh.
 const result=await Promise.all(paths.map((p,i)=>request(p,copies[i],undefined,401)));
 check(result.every(r=>r.headers.getSetCookie().length===0), 'Expired ordinary requests must not mutate cookies');
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('apps/desktop/src/lib/session-fetch.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Response,Error});
 // This runner supplies one shared lock manager and cookie jar, like one browser
 // profile. Separate client instances model separate windows; unit tests also
 // exercise parallel shared locks and logout racing against recovery.
 let tail=Promise.resolve();
 const locks={request(_name,_options,fn){const job=tail.then(fn);tail=job.catch(()=>{});return job;}};
 let epoch='';
 const transport=async(path,init={})=>{
  const response=await fetch(origin+path,{...init,redirect:'manual',headers:{...init.headers,origin,cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},signal:AbortSignal.timeout(30000)});
  for(const cookie of response.headers.getSetCookie()){
   const [pair,...flags]=cookie.split(';');const i=pair.indexOf('=');const k=pair.slice(0,i);
   if(![access,refresh].includes(k))continue;
   if(flags.some(x=>x.trim().toLowerCase()==='max-age=0'))jar.delete(k);else jar.set(k,pair.slice(i+1));
  }
  return response;
 };
 const boundary={read:()=>epoch,change:()=>{epoch+='x';}};
 const clients=[exports.createSessionFetch(transport,locks,boundary),exports.createSessionFetch(transport,locks,boundary)];
 const recovered=await Promise.all(paths.map((p,i)=>clients[i%2](p)));
 check(recovered.every(r=>r.status===200),'Coordinated expired-session requests must all recover');
 check(jar.has(access)&&jar.has(refresh),'Recovered secure cookies required');
 const renewed=jar.get(refresh);jar.delete(access);
 await request('/api/auth/session',jar,{});
 check(jar.get(refresh)!==renewed,'Recovered token family must still support another rotation');
 console.log('PASS: concurrent expired requests preserve cookies; coordinated windows recover all four routes and retain a usable refresh family.');
} finally {
 for(const j of [jar]) if(j.has(refresh)) try{await request('/api/auth/logout',j,{});}catch{}
}
function cookiesPresent(j){return j.has(access)&&j.has(refresh);}
