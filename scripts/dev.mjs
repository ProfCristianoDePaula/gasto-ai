/**
 * Script de desenvolvimento unificado (Vite + Wrangler Worker).
 * Ignora flags extras como `--port 3000 --host 0.0.0.0` repassadas pelo runtime.
 */
import { spawn } from 'node:child_process';

const isRemote = process.argv.includes('--remote');
const wranglerArgs = [
  'wrangler',
  'dev',
  ...(isRemote ? [] : ['--local']),
  '--ip',
  '127.0.0.1',
  '--port',
  '8787',
];

const children = [
  spawn('npx', ['vite', '--port=3000', '--host=0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,
  }),
  spawn('npx', wranglerArgs, {
    stdio: 'inherit',
    env: process.env,
  }),
];

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown('SIGTERM');
      process.exit(code);
    }
  });
}
