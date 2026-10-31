import {createPool,migrate} from '../server/postgres.mjs';
import {databaseUrl} from '../server/database-config.mjs';
import {loadLocalEnv} from '../server/env.mjs';
loadLocalEnv();
let connection;
try {connection=databaseUrl(process.env);}catch(error){console.error(error.message);process.exit(1);}
const pool=createPool(connection,process.env);
try {await migrate(pool);console.log('Database tables are up to date.');}
catch {console.error('Database migration failed. Check the connection and permissions.');process.exitCode=1;}
finally {await pool.end();}
