import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTestDb} from './database-test-helper.mjs';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const {default:worker,aiRequest,aiConnected}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {aiRequest,aiConnected}').toString('base64'));
const original=globalThis.fetch;let calls=[];
const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'gemini-test-only',OPENAI_API_KEY:'openai-DO-NOT-SEND',DB:createTestDb(),BUCKET:{get:async()=>null}};
function reply(payload,finish_reason='stop'){return Response.json({choices:[{message:{content:typeof payload==='string'?payload:JSON.stringify(payload)},finish_reason}]});}
try{
 assert.equal(aiConnected({...env,OPENAI_API_KEY:undefined}),true);assert.equal(aiConnected({...env,GEMINI_API_KEY:undefined}),false);
 globalThis.fetch=async(url,options)=>{calls.push({url,options,body:JSON.parse(options.body)});return reply({allowed:true});};
 const schema={type:'object',properties:{allowed:{type:'boolean'}},required:['allowed'],additionalProperties:false};
 const normalized=await aiRequest(env,{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:JSON.stringify({instructions:'Scope policy',input:'Tamil visitor question',max_output_tokens:150,text:{format:{type:'json_schema',name:'scope_permission',schema}}})});
 assert.equal((await normalized.json()).output[0].content[0].text,'{"allowed":true}');
 assert.equal(calls[0].url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');assert.equal(calls[0].options.headers.Authorization,'Bearer gemini-test-only');assert.ok(!JSON.stringify(calls).includes('openai-DO-NOT-SEND'));
 assert.deepEqual(calls[0].body.response_format.json_schema.schema,schema);assert.equal(calls[0].body.model,'gemini-3.5-flash-lite');assert.equal(calls[0].body.messages[0].role,'system');
 globalThis.fetch=async()=>reply('{}','length');assert.equal((await(await aiRequest(env,{body:'{"input":"test"}'})).json()).status,'incomplete');
 globalThis.fetch=async()=>reply('', 'content_filter');assert.equal((await(await aiRequest(env,{body:'{"input":"test"}'})).json()).output[0].content.length,0);
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({output:[]});};
 await aiRequest({OPENAI_API_KEY:'openai-test'}, {method:'POST',body:'{}'});assert.equal(calls.at(-1).url,'https://api.openai.com/v1/responses');
 const post=(path,body)=>worker.fetch(new Request('https://test.local'+path,{method:'POST',headers:{Origin:'https://test.local'},body:JSON.stringify(body)}),env);
 let index=0;calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});index++;return reply({reply:'Aakash is a stand-up comedian known for observational comedy.',scope:'aakash',language:'English',intent:'other',showIds:[],suggestions:[],audience:'neutral',empathyScore:1});};
 const session=(await(await post('/api/chat/sessions',{surface:'live',greeting:'Test greeting'})).json()).session;
 const result=await post('/api/chat',{session,turnId:crypto.randomUUID(),messages:[{role:'user',content:'Tell me about Aakash Gupta'}],context:{language:'English',personaScale:1}});
 assert.equal(result.status,200,await result.clone().text());assert.match((await result.json()).reply,/Aakash/);
 assert.ok(calls.length);assert.ok(calls.every(c=>c.url.includes('generativelanguage.googleapis.com')));
 const history=await(await post('/api/chat/history',{session})).json();assert.ok(history.messages.some(m=>m.role==='assistant'&&m.content.includes('observational')));
}finally{globalThis.fetch=original;}
console.log('PASS Gemini: provider isolation, schema/history translation, truncation, no OpenAI fallback and saved chat replies.');
