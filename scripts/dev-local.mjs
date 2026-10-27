import { spawn } from 'node:child_process';

// One command for two local services; stopping it also stops their child processes.
const command = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';
const children = ['dev:api', 'dev:web'].map((script) =>
  spawn(command, ['pnpm', script, ...(script === 'dev:web' ? process.argv.slice(2) : [])], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: { ...process.env, APP_ENV: 'development' },
  }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* Child may already have exited. */
    }
  }
}
for (const child of children) {
  child.once('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.once('exit', (code) => stop(code ?? 1));
}
process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
