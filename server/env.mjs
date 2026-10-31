import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Deployment-provided values win. Node's loader never prints credential values.
export function loadLocalEnv() {
  for (const name of ['.env.local','.env']) {
    const path=fileURLToPath(new URL('../'+name,import.meta.url));
    if(existsSync(path)) process.loadEnvFile(path);
  }
}
