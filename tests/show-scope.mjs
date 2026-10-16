import {storageTestWorker} from './database-test-helper.mjs';
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');const {default:baseWorker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const worker=storageTestWorker(baseWorker);const dataset=JSON.parse(await readFile(new URL('../data/sample-shows.json',import.meta.url),'utf8'));const env={OPENAI_API_KEY:'test-only',BUCKET:{async get(){return null}}};let prompt,reply={reply:'See these upcoming sample dates.',language:'English',idlePrompt:'other',visitorName:'',scope:'aakash',scopeNotice:'',intent:'show_schedule',showIds:['AG001','AG002','AG003'],suggestions:[]};globalThis.fetch=async(_,options)=>{prompt=JSON.parse(options.body).instructions;return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(reply)}]}]})};const request=message=>new Request('https://test.local/api/chat',{method:'POST',headers:{Origin:'https://test.local'},body:JSON.stringify({messages:[{role:'user',content:message}],context:{language:reply.language,nameAsked:true,tone:'akash'}})});let data=await (await worker.fetch(request('Upcoming shows?'),env)).json();assert.equal(data.shows.length,3);assert.equal(data.shows[0].city,'Mumbai');assert.equal(data.shows[0].date,'2026-11-07');assert.equal(data.shows[1].date,'2026-11-14');assert.match(prompt,/ANY other comedian/);assert.match(prompt,/2027-04-10/);assert.ok(!prompt.includes('New Delhi Nov 7'));assert.equal(data.idlePrompt,'Excuse me brother, kidhar?');
reply={...reply,intent:'show_details',showIds:['AG009']};data=await (await worker.fetch(request('Show in Delhi?'),env)).json();assert.equal(data.shows[0].date,'2027-01-16');assert.equal(data.shows[0].availability,'Sold Out');assert.ok(!/[—–]/.test(data.shows[0].price));reply={...reply,intent:'show_schedule',showIds:dataset.map(s=>s.id)};data=await (await worker.fetch(request('All dates?'),env)).json();assert.equal(data.shows.length,20);
reply={...reply,scope:'other_comedian',reply:'A competing comedian is better',showIds:['AG001'],suggestions:[{label:'Other comedian',query:'Other comedian',action:'ask'}]};data=await (await worker.fetch(request('Compare Aakash with another comedian'),env)).json();assert.match(data.reply,/This platform focuses only on Aakash Gupta[.;] I cannot provide inputs on other comedians\./);assert.equal(data.shows.length,0);assert.ok(data.suggestions.every(s=>!/other comedian|another comedian|samay|competing/i.test(s.query)));reply={...reply,language:'Hindi'};data=await (await worker.fetch(request('दूसरे कॉमेडियन के बारे में बताओ'),env)).json();assert.match(data.reply,/केवल आकाश गुप्ता/);assert.match(data.reply,/अन्य कॉमेडियन/);
const api=await (await worker.fetch(new Request('https://test.local/api/shows'),env)).json();assert.deepEqual(api.shows,dataset);assert.equal(new Set(dataset.map(s=>s.id)).size,20);assert.ok(dataset.every(s=>/^20\d\d-\d\d-\d\d$/.test(s.date)));const page=await (await worker.fetch(new Request('https://test.local/shows'),env)).text();assert.match(page,/2026-11-07/);assert.match(page,/2027-04-10/);assert.match(page,/illustrative/);
console.log('Passed: all 20 source records, schedule/Delhi date cards, sold-out data, Aakash-only scope override in English and Hindi, full schedule page.');

reply={...reply,language:'Hinglish',redirectHumour:'microphone'};
data=await (await worker.fetch(request('mujhe samay raina ke videos dekhne hai'),env)).json();
assert.match(data.reply,/Yahan mic sirf Aakash ka hai/);
assert.match(data.reply,/sirf Aakash Gupta/);
assert.match(data.reply,/kisi aur comedian/);
assert.ok(!/samay|raina/i.test(data.reply));
assert.equal(data.shows.length,0);
assert.match(prompt,/gentle situational observation/);
const scopeModule=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {scopeReply,defaults};').toString('base64'));
for(const language of ['English','Hindi','Hinglish']){
 for(const redirectHumour of ['microphone','queue','detour']){
  const playful=scopeModule.scopeReply({language,redirectHumour},scopeModule.defaults);
  assert.ok(playful.includes('!'));
  assert.ok(!/[–—]/.test(playful));
  const serious=scopeModule.scopeReply({language,redirectHumour},{...scopeModule.defaults,empathy:8});
  assert.ok(!serious.includes('!'));
 }
}
const restricted={...scopeModule.defaults,empathyStages:scopeModule.defaults.empathyStages.map(stage=>({...stage,humour:'No jokes.'}))};
assert.equal(scopeModule.scopeReply({language:'English',redirectHumour:'microphone'},restricted),'This platform focuses only on Aakash Gupta. I cannot provide inputs on other comedians.');
console.log('Passed: playful scope redirects in three languages, no rival details, empathy and admin humour restrictions preserved.');
