import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const tests=readdirSync(new URL('../tests/',import.meta.url)).filter(n=>n.endsWith('.mjs')&&n!=='database-test-helper.mjs').sort();let failures=0;
for(const name of tests){const result=spawnSync(process.execPath,[new URL('../tests/'+name,import.meta.url).pathname],{encoding:'utf8',maxBuffer:16*1024*1024});console.log((result.status===0?'PASS ':'FAIL ')+name);if(result.status!==0){failures++;process.stderr.write(result.stdout+result.stderr)}}
console.log(`${tests.length-failures}/${tests.length} suites passed.`);process.exitCode=failures?1:0;
