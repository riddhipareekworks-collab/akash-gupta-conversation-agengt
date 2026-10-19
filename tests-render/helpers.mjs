import { PGlite } from '@electric-sql/pglite';
export async function testPool() {
  const db=new PGlite(); await db.waitReady;
  let queue=Promise.resolve();
  const acquire=async()=>{const previous=queue;let release;queue=new Promise(r=>release=r);await previous;return release;};
  const query=async(sql,args)=>{
    const result=args ? await db.query(sql,args) : (await db.exec(sql)).at(-1);
    return {...result,rowCount:result.affectedRows || result.rows.length};
  };
  return {
    async query(sql,args){const release=await acquire();try{return await query(sql,args);}finally{release();}},
    async connect(){const release=await acquire();return {query,release};},
    async end(){await db.close();},
  };
}
export const config={APP_ORIGIN:'https://test.local',ADMIN_OWNER_EMAIL:'owner@example.com',ADMIN_PASSWORD:'test-only-admin-password',SESSION_SECRET:'test-only-secret-at-least-32-characters',TEAM_PASSWORD:'test-only-team-password',SITE_ACCESS:'private',OPENAI_API_KEY:'test-only',R2_BUCKET:'test-bucket',R2_ENDPOINT:'https://test.r2.cloudflarestorage.com',R2_ACCESS_KEY_ID:'test',R2_SECRET_ACCESS_KEY:'test'};
