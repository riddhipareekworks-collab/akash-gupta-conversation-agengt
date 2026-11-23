import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const {reportAiFailure}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {reportAiFailure}').toString('base64'));
const logs=[],original=console.error;console.error=(...items)=>logs.push(items);
try{
 const response=Response.json({error:{code:'insufficient_quota',type:'insufficient_quota',message:'DO_NOT_LOG_PRIVATE_KEY_OR_MESSAGE'}},{status:429});
 await reportAiFailure(response,'reply');assert.equal(logs[0][1].code,'insufficient_quota');assert.equal(logs[0][1].status,429);
 assert.ok(!JSON.stringify(logs).includes('DO_NOT_LOG'));
 assert.ok((await response.json()).error.message); // Logging must not consume the upstream response.
 await reportAiFailure(Response.json({error:{code:'secret key in unexpected field',type:'https://private.example'}},{status:401}),'scope');
 assert.equal(logs[1][1].code,'unknown');assert.equal(logs[1][1].type,'unknown');
}finally{console.error=original;}
console.log('PASS AI diagnostics retain error classes without logging private messages or credentials.');
