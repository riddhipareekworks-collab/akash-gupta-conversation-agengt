import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sprintPose,desktopStops,ERA_FRAMES} from '../frontend/components/sprint-motion.mjs';
import worker from '../worker/index.js';

assert.equal(new Set(ERA_FRAMES).size,4,'Each era needs its outfit asset');
for(const [chapter,progress] of desktopStops.entries()){
 const pose=sprintPose(progress);
 assert.equal(pose.frame,ERA_FRAMES[chapter]);assert.equal(pose.chapter,chapter);assert.equal(pose.stopped,true);assert.equal(pose.y,0);assert.equal(pose.tilt,0);
 // The era pairing remains stable while moving within a chapter.
 const moving=sprintPose(chapter===3?progress-.07:progress+.07);
 assert.equal(moving.chapter,chapter);assert.equal(moving.frame,ERA_FRAMES[chapter]);assert.equal(moving.stopped,false);assert.ok(Math.abs(moving.tilt)<=6);
}
for(let i=0;i<3;i++){
 const boundary=(desktopStops[i]+desktopStops[i+1])/2;
 assert.equal(sprintPose(boundary-.001).frame,ERA_FRAMES[i]);assert.equal(sprintPose(boundary+.001).frame,ERA_FRAMES[i+1]);
}
assert.equal(sprintPose(.25,-1).flip,-1);assert.equal(sprintPose(.25,1).flip,1);assert.equal(sprintPose(-1).frame,ERA_FRAMES[0]);assert.equal(sprintPose(2).frame,ERA_FRAMES[3]);
const manifest=JSON.parse(await readFile(new URL('../public/sprites/manifest.json',import.meta.url),'utf8'));
const revisions=[];
for(const name of ERA_FRAMES){
 const asset=manifest.find(row=>row.file===name+'.png');assert.ok(asset);assert.deepEqual(asset.size,[600,800]);assert.equal(asset.alphaBBox[3],784);revisions.push(asset.revision);assert.ok(Math.abs(asset.alphaBBox[1]-282)<=8,'Runner head alignment must remain consistent');if(name!=='era_4_worldtour')assert.equal(asset.poseSource,'era_4_worldtour.png');
 const response=await worker.fetch(new Request('https://test.local/sprites/'+name+'.png?v='+asset.revision),{});
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');
 const bytes=Buffer.from(await response.arrayBuffer()),disk=await readFile(new URL('../public/sprites/'+name+'.png',import.meta.url));assert.deepEqual(bytes,disk);
 assert.equal(bytes.readUInt32BE(16),600);assert.equal(bytes.readUInt32BE(20),800);assert.equal(bytes[25],6,'PNG must contain RGBA channels');
}
assert.equal(new Set(revisions).size,4,'Era outfits should remain visually distinct');
console.log('PASS shared running pose, distinct era outfits, chapter changes, aligned RGBA PNGs, and deployed asset URLs');
