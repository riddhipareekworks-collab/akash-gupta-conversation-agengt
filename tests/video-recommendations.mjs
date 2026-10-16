import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');
const {recommendVideos,parseVideoFeed}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {recommendVideos,parseVideoFeed};').toString('base64'));
const output=()=>({scope:'aakash',language:'English',flow:{intent:'watch_videos'}});const state={};let out=output();await recommendVideos(out,state,'popular videos');assert.match(out.reply,/Sarojini Nagar/);assert.match(out.reply,/Dogs/);assert.match(out.reply,/Paan/);out=output();await recommendVideos(out,state,'more videos');assert.doesNotMatch(out.reply,/Sarojini Nagar/);assert.match(out.reply,/School/);
globalThis.fetch=async()=>new Response('Unavailable',{status:503});out=output();await recommendVideos(out,{},'latest video');assert.match(out.reply,/Recent videos I could verify/);assert.match(out.reply,/2026-05-30/);assert.match(out.reply,/All latest uploads/);
const xml='<feed><yt:channelId>UCAYum5hCyfkSH5T3vSD_kwQ</yt:channelId><entry><yt:videoId>abcdefghijk</yt:videoId><title>New &amp; funny</title><published>2026-10-16T00:00:00Z</published></entry></feed>';
assert.equal(parseVideoFeed(xml)[0].title,'New & funny');globalThis.fetch=async()=>new Response(xml);out=output();await recommendVideos(out,{},'new videos');assert.match(out.reply,/New & funny/);assert.doesNotMatch(out.reply,/could verify/);
out={...output(),scope:'other_comedian',reply:'Scope notice'};await recommendVideos(out,{},'latest video');assert.equal(out.reply,'Scope notice');assert.ok(source.includes('View all 20 show dates'));console.log('PASS multiple, more, dated fallback, live feed, and scope guards');
