// Isolated synthetic Chase lifecycle verifier. Never points at production.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
assert.equal(process.env.WORTHLANE_HOSTED_SANDBOX_APPROVED, 'true', 'Explicit isolated Sandbox approval required');
const capture = process.argv[2] === '--capture';
assert(capture || process.argv[2] === '--verify', 'Choose --capture or --verify');
assert.equal(statSync('.tmp/hosted-sandbox-fixture.json').mode & 0o777, 0o600);
const snapshotPath = '.tmp/hosted-mac-sep21-link-fixture.json';
const f=JSON.parse(readFileSync('.tmp/hosted-sandbox-fixture.json','utf8'));
assert.equal(f.origin,'https://worthlane-beta-sandbox.up.railway.app');
async function req(path,token,body){const r=await fetch(f.origin+'/api'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,200);return (await r.json()).data;}
const auth=await req('/auth/login',null,{email:f.email,password:f.password});
const a=await req('/accounts',auth.accessToken);
const original={itemId:f.itemId,accountIds:f.accountIds,transactionIds:[f.transactionId]};
assert(a.plaidItems.some(x=>x.id===original.itemId));
assert(original.accountIds.every(id=>a.accounts.some(x=>x.id===id)));
const fresh=a.plaidItems.filter(x=>x.id!==original.itemId);assert.equal(fresh.length,1);assert.equal(fresh[0].institution,'Chase');
assert.equal(fresh[0].status, 'HEALTHY'); assert.equal(fresh[0].needsRelink, false);
const newAccounts=a.accounts.filter(x=>!original.accountIds.includes(x.id));assert(newAccounts.length>0);
assert.equal(newAccounts.length,14);
const baseline=JSON.parse(readFileSync('.tmp/ios-before-oauth.json','utf8'));
const before=await req('/transactions?limit=1000',auth.accessToken);assert.equal(before.transactions.length,before.total); assert(before.transactions.every(x => typeof x.account?.id === 'string')); assert(original.transactionIds.every(id=>before.transactions.some(x=>x.id===id))); for(const tx of baseline) assert.deepEqual(before.transactions.find(x=>x.id===tx.id),tx);
await req('/plaid/sync',auth.accessToken,{plaidItemId:fresh[0].id});
const after=await req('/transactions?limit=1000',auth.accessToken);assert.equal(after.transactions.length,after.total);
assert.equal(new Set(after.transactions.map(x=>x.id)).size,after.total);
const snap=x=>x.transactions.slice().sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(snap(before),snap(after));
const owner=await req('/auth/login',null,{email:f.partner.email,password:f.partner.password});const oa=await req('/accounts',owner.accessToken);assert.deepEqual(oa.accounts.map(x=>x.id).sort(),f.partner.nativeLink.accountIds.slice().sort());assert(!oa.accounts.some(x=>newAccounts.some(n=>n.id===x.id)));
const partnerLedger=await req('/transactions?limit=1000',owner.accessToken);assert.equal(partnerLedger.transactions.length,partnerLedger.total);assert.deepEqual(partnerLedger.transactions.map(x=>x.id).sort(),f.partner.nativeLink.transactionIds.slice().sort());assert(!partnerLedger.transactions.some(x=>newAccounts.some(n=>n.id===x.account.id)));
const linkedTransactions = after.transactions.filter(x=>newAccounts.some(a=>a.id===x.account.id));
assert(linkedTransactions.length > 0, 'New bank transaction baseline must not be empty');
const snapshot = {itemId:fresh[0].id,accountIds:newAccounts.map(x=>x.id).sort(),transactionIds:linkedTransactions.map(x=>x.id).sort(),verifiedAt:new Date().toISOString()};
if (capture) {
  writeFileSync(snapshotPath, JSON.stringify(snapshot), {mode:0o600});
} else {
  const saved = JSON.parse(readFileSync(snapshotPath,'utf8'));
  assert(saved.transactionIds.length > 0, 'Refuse empty historical transaction baseline');
  assert.equal(snapshot.itemId,saved.itemId);
  assert.deepEqual(snapshot.accountIds,saved.accountIds.slice().sort());
  assert.deepEqual(snapshot.transactionIds,saved.transactionIds.slice().sort());
}
console.log(`PASS: ${capture ? 'captured nonempty baseline' : 'verified saved IDs'}; ${newAccounts.length} linked accounts, ${linkedTransactions.length} linked transactions, ${after.total} stable full owner ledger rows; original records and partner privacy preserved.`);
