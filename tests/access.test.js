import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,webcrypto} from 'node:crypto';
import {masterAccess,leaveMaster} from '../src/access.js';
globalThis.crypto ||= webcrypto;
test('only a matching master link unlocks; saved access survives reopen without changing earned progress',async()=>{
 const values=new Map([['manlyfy-progress-v1','{"photos":5}']]),storage={getItem:key=>values.get(key),setItem:(key,v)=>values.set(key,v),removeItem:key=>values.delete(key)};
 const token=randomBytes(32).toString('base64url'),digest=createHash('sha256').update(token).digest('hex');
 assert.equal(await masterAccess({hash:'#master=wrong',storage,digest}),false);
 assert.equal(await masterAccess({hash:'#master='+token,storage,digest}),true);
 assert.equal(await masterAccess({hash:'',storage,digest}),true);
 leaveMaster(storage);assert.equal(await masterAccess({hash:'',storage,digest}),false);
 assert.equal(values.get('manlyfy-progress-v1'),'{"photos":5}');
});
test('valid link works for a visit even when browser storage is unavailable',async()=>{
 const token='test-local-access',digest=createHash('sha256').update(token).digest('hex'),storage={getItem(){throw new Error();},setItem(){throw new Error();}};
 assert.equal(await masterAccess({hash:'#master='+token,storage,digest}),true);
});
