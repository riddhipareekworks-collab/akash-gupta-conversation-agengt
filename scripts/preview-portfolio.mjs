// UI-only local preview; production keeps its database and authenticated server.
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import worker from '../worker/index.js';

export function createPreviewServer({app=worker}={}) {
  return http.createServer(async(req,res)=>{
    try {
      const origin=`http://${req.headers.host}`;
      const method=req.method||'GET';
      const request=new Request(new URL(req.url,origin),{
        method,headers:req.headers,
        ...(['GET','HEAD'].includes(method)?{}:{body:req,duplex:'half'})
      });
      // This design preview deliberately has no production database or API keys.
      const path=new URL(request.url).pathname;
      const response=path.startsWith('/api/')&&!['GET','HEAD'].includes(method)
        ? Response.json({error:'Live chat is not connected in this design preview. Open the deployed website to chat.'},{status:503})
        : await app.fetch(request,{});
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(503,{'Content-Type':'application/json'});
      res.end(JSON.stringify({error:'The design preview could not load. Please try again.'}));
    }
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT||4173);
  createPreviewServer().listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
}
