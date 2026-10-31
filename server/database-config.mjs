export function databaseUrl(env) {
  const provider=env.DATABASE_PROVIDER||'postgres';
  if(!['postgres','supabase'].includes(provider)) throw new Error('DATABASE_PROVIDER must be postgres or supabase.');
  const value=provider==='supabase'?env.SUPABASE_DB_URL:env.DATABASE_URL;
  if(!value?.trim()) throw new Error('Set '+(provider==='supabase'?'SUPABASE_DB_URL':'DATABASE_URL')+'.');
  let url;try{url=new URL(value);}catch{throw new Error('The database connection string is invalid.');}
  if(!/^postgres(ql)?:$/.test(url.protocol)) throw new Error('Use a PostgreSQL database connection string, not a Supabase API URL or API key.');
  return value;
}
