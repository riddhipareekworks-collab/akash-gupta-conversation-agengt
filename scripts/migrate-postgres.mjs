import {createPool,migrate} from '../server/postgres.mjs';
if (!process.env.DATABASE_URL) {console.error('Set DATABASE_URL first.');process.exit(1);}
const pool=createPool(process.env.DATABASE_URL);
try {await migrate(pool);console.log('Database tables are up to date.');}
catch {console.error('Database migration failed. Check the connection and permissions.');process.exitCode=1;}
finally {await pool.end();}
