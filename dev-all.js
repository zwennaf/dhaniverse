#!/usr/bin/env node
import { spawn } from 'child_process';

const shell = process.env.COMSPEC || 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

function spawnCmd(command, name) {
  console.log(`Starting ${name}: ${command}`);
  const child = spawn(command, { shell, stdio: 'inherit' });

  child.on('exit', (code, signal) => {
    console.log(`${name} exited with code=${code} signal=${signal}`);
  });

  child.on('error', (err) => {
    console.error(`${name} error:`, err);
  });

  return child;
}

const procs = [];

// web
procs.push(spawnCmd('npm --prefix web run dev', 'web'));

// game (vite)
procs.push(spawnCmd('npm run dev:game', 'game'));

// servers
// spawn deno server processes directly to avoid `concurrently`/cmd.exe issues
procs.push(spawnCmd("deno run -A --unstable-detect-cjs --env-file=server/game/.env --watch server/game/index.ts", 'server:game'));
procs.push(spawnCmd("deno run -A --env-file=server/ws/.env --watch server/ws/ws.ts", 'server:ws'));

function shutdown() {
  console.log('Shutting down children...');
  for (const p of procs) {
    try { p.kill('SIGTERM'); } catch (e) {}
  }
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);