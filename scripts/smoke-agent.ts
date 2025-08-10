import { run } from '@openai/agents';
import { analyticsAgent } from '@/server/agent';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load env files in order: project/.env.local, project/.env, workspaceRoot/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const candidates = [
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env'),
  path.join(workspaceRoot, '.env'),
];
for (const p of candidates) {
  if (existsSync(p)) {
    loadEnv({ path: p });
  }
}

async function main() {
  const res = await run(analyticsAgent, 'Katakan "ok" lalu berhenti.');
  console.log('finalOutput:', res.finalOutput);
}

main().catch((e) => {
  console.error('Smoke test failed:', e);
  process.exit(1);
});


