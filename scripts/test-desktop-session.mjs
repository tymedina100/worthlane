import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function load(path, globals={}) {
 const exports={};
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Response,Headers,URL,Map,Error,...globals});
 return exports;
}
const {createSessionFetch}=load('../apps/desktop/src/lib/session-fetch.ts');
// Fair Web Locks model shared by two independent client instances/windows.
class Locks {
 queue=[]; active=0; exclusive=false;
 request(name,{mode},fn){return new Promise((resolve,reject)=>{this.queue.push({mode,fn,resolve,reject});this.pump();});}
 pump(){
  if(this.exclusive)return;
  while(this.queue.length){
   const job=this.queue[0];if(job.mode==='exclusive'&&this.active)return;
   this.queue.shift();this.active++;this.exclusive=job.mode==='exclusive';
   Promise.resolve().then(job.fn).then(job.resolve,job.reject).finally(()=>{this.active--;this.exclusive=false;this.pump();});
   if(this.exclusive)return;
  }
 }
}
function harness({failure=0}={}){
 const locks=new Locks();let epochValue=0,valid=false,loggedIn=true,rotations=0,mutations=0;
 const calls=[];const epoch={read:()=>String(epochValue),change:()=>epochValue++};
 const fetcher=async(path,init)=>{
  calls.push(path);const wasValid=valid;await tick();
  if(path==='/api/auth/logout'){valid=false;loggedIn=false;return new Response('{}');}
  if(path==='/api/auth/session'){
   assert.equal(init.headers['Content-Type'],'application/json');assert.equal(init.body,'{}');
   if(failure)return new Response('{}',{status:failure});
   if(!loggedIn)return new Response('{}',{status:401});
   if(!valid){rotations++;valid=true;}
   return new Response('{}');
  }
  if(!wasValid)return new Response('{}',{status:401});
  if(init?.method==='POST')mutations++;
  return new Response('{}');
 };
 return {a:createSessionFetch(fetcher,locks,epoch),b:createSessionFetch(fetcher,locks,epoch),calls,get rotations(){return rotations;},get mutations(){return mutations;}};
}
test('two windows recover parallel expiry once and retry a rejected mutation exactly once',async()=>{
 const h=harness();const r=await Promise.all([h.a('/api/accounts'),h.b('/api/summary'),h.a('/api/transactions'),h.b('/api/goals',{method:'POST',body:'{}'})]);
 assert(r.every(x=>x.status===200));assert.equal(h.rotations,1);assert.equal(h.mutations,1);
});
test('logout ahead of queued recovery does not resurrect or replay the old session',async()=>{
 const h=harness();const stale=h.a('/api/goals',{method:'POST',body:'{}'});const logout=h.b('/api/auth/logout',{method:'POST'});
 assert.equal((await stale).status,401);assert.equal((await logout).status,200);assert.equal(h.rotations,0);assert.equal(h.mutations,0);assert(!h.calls.includes('/api/auth/session'));
});
test('temporary refresh failure does not retry mutation or disguise outage as logout',async()=>{
 const h=harness({failure:502});assert.equal((await h.a('/api/goals',{method:'POST'})).status,502);assert.equal(h.mutations,0);assert.equal(h.rotations,0);
});
test('client refuses unrelated destinations',async()=>{
 const h=harness();await assert.rejects(h.a('https://example.com/api/private'),/relative Worthlane/);assert.equal(h.calls.length,0);
});
function serverFixture(status=200){
 const writes=[];const values=new Map([['access','expired'],['refresh','old']]);const calls=[];
 const cookies={get:k=>values.has(k)?{value:values.get(k)}:undefined,set:(k,v,o)=>{writes.push({k,v,o});if(o.maxAge===0)values.delete(k);else values.set(k,v);}};
 const api=load('../apps/desktop/src/lib/server-api.ts',{
  process:{env:{WORTHLANE_API_URL:'http://localhost:3001/api'}},
  require:name=>name==='server-only'?{}:name==='crypto'?{createHash:()=>({update(){return this},digest:()=> 'digest'})}:name==='net'?{isIP:()=>0}:name==='next/server'?{NextResponse:Response}:name==='./session-cookies'?{ACCESS_TOKEN_COOKIE:'access',REFRESH_TOKEN_COOKIE:'refresh',PLAID_OAUTH_COOKIE:'oauth'}:assert.fail(name),
  fetch:async(url,init)=>{calls.push(url);if(url.endsWith('/auth/refresh'))return new Response(JSON.stringify({data:{accessToken:'fresh',refreshToken:'next'}}),{status});return new Response('{}',{status:init.headers.get('authorization')==='Bearer fresh'?200:401});},
 });return {api,cookies,writes,calls};
}
test('ordinary serverless routes never rotate or clear cookies on parallel 401s',async()=>{
 const h=serverFixture();const r=await Promise.all(['/accounts','/summary','/goals'].map(p=>h.api.authenticatedServerRequest(h.cookies,p)));
 assert(r.every(x=>x.status===401));assert.equal(h.writes.length,0);assert(!h.calls.some(x=>x.endsWith('/auth/refresh')));
});
test('explicit refresh restores protected cookies and no token is exposed by ordinary response',async()=>{
 const h=serverFixture();assert.equal((await h.api.authenticatedServerRequest(h.cookies,'/accounts',{},true)).status,200);
 assert.equal(h.writes.length,2);assert(h.writes.every(x=>x.o.httpOnly&&x.o.secure&&x.o.sameSite==='lax'));assert.equal(h.cookies.get('refresh').value,'next');
});
test('refresh rate limit preserves session cookies for retry',async()=>{
 const h=serverFixture(429);assert.equal((await h.api.authenticatedServerRequest(h.cookies,'/accounts',{},true)).status,502);assert.equal(h.writes.length,0);
});
test('invalid refresh clears unusable session',async()=>{
 const h=serverFixture(401);assert.equal((await h.api.authenticatedServerRequest(h.cookies,'/accounts',{},true)).status,401);assert.equal(h.cookies.get('refresh'),undefined);
});
test('refresh route rejects foreign origins and strips the probe financial payload',async()=>{
 let denied=true,calls=0;
 const route=load('../apps/desktop/app/api/auth/session/route.ts', {require:name=>name==='next/headers'?{cookies:async()=>({})}:{
  sameOriginMutationError:()=>denied?new Response('{}',{status:403}):null,
  authenticatedServerRequest:async()=>{calls++;return new Response(JSON.stringify({accounts:['private']}));},
  jsonResponse:(body,status)=>new Response(JSON.stringify(body),{status}),
  upstreamUnavailableResponse:()=>new Response('{}',{status:502}),
 }});
 assert.equal((await route.POST({})).status,403);assert.equal(calls,0);
 denied=false;const response=await route.POST({});assert.deepEqual(await response.json(),{data:{success:true}});
});
test('logout revokes refresh directly without attempting access-token rotation',async()=>{
 let sent;const route=load('../apps/desktop/app/api/auth/logout/route.ts',{require:name=>name==='next/headers'?{cookies:async()=>({get:()=>({value:'synthetic-refresh'})})}:{
  REFRESH_TOKEN_COOKIE:'refresh',sameOriginMutationError:()=>null,
  publicServerRequest:async(path,init)=>{sent={path,init};return new Response('{}');},
  clearSessionCookies:()=>{},jsonResponse:body=>new Response(JSON.stringify(body)),
 }});
 assert.equal((await route.POST({})).status,200);assert.equal(sent.path,'/auth/logout');assert.equal(JSON.parse(sent.init.body).refreshToken,'synthetic-refresh');assert.equal(sent.init.headers,undefined);
});
