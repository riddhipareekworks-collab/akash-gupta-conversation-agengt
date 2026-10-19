export function loadConfig(env) {
  const config = {...env, APP_ORIGIN: env.APP_ORIGIN || env.RENDER_EXTERNAL_URL,
    SITE_ACCESS: env.SITE_ACCESS || 'private', ASSET_STORAGE:env.ASSET_STORAGE || 'postgres'};
  const required = ['DATABASE_URL','OPENAI_API_KEY','ADMIN_OWNER_EMAIL','ADMIN_PASSWORD','SESSION_SECRET',
    'APP_ORIGIN'];
  if (config.ASSET_STORAGE === 'r2') required.push('R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY');
  if (!['postgres','r2'].includes(config.ASSET_STORAGE)) throw new Error('ASSET_STORAGE must be postgres or r2.');
  const missing = required.filter(k => !config[k]?.trim());
  if (missing.length) throw new Error('Missing environment settings: '+missing.join(', '));
  if (config.ADMIN_PASSWORD.length < 16 || config.SESSION_SECRET.length < 32 || (config.TEAM_PASSWORD && config.TEAM_PASSWORD.length < 16)) throw new Error('Admin/team passwords need at least 16 characters; SESSION_SECRET needs at least 32.');
  if (!['private','public'].includes(config.SITE_ACCESS)) throw new Error('SITE_ACCESS must be private or public.');
  const origin = new URL(config.APP_ORIGIN);
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(origin.hostname))) throw new Error('APP_ORIGIN must use HTTPS (except local development).');
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN must be an origin without a path.');
  config.APP_ORIGIN = origin.origin;
  if (!/^postgres(ql)?:$/.test(new URL(config.DATABASE_URL).protocol)) throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  if (config.ASSET_STORAGE === 'r2' && new URL(config.R2_ENDPOINT).protocol !== 'https:') throw new Error('R2_ENDPOINT must use HTTPS.');
  return config;
}
