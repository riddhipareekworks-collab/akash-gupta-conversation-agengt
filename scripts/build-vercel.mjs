import {mkdir,writeFile,access} from 'node:fs/promises';
// Compile the same UI used by the local preview before packaging the function.
import './build-portfolio.mjs';
// Only this generated directory is public. Application source and .env stay private.
const publicDir=new URL('../public/',import.meta.url);
await mkdir(publicDir,{recursive:true});
await writeFile(new URL('robots.txt',publicDir),'User-agent: *\nDisallow: /admin\nDisallow: /api/\n');
for(const file of ['../api/index.mjs','../server/vercel.mjs','../db/postgres/004.sql','../assets/reaction-pack/rules.json'])await access(new URL(file,import.meta.url));
console.log('Vercel entry point and public output prepared. No database credentials are used during build.');
