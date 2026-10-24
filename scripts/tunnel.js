#!/usr/bin/env node

/**
 * ClayPull — Ollama HTTPS Tunnel Helper
 * Exposes local Ollama (http://localhost:11434) via an encrypted HTTPS tunnel
 * so it can be securely called from https://claypull.vercel.app without browser mixed-content restrictions.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

console.log(`
${colors.magenta}${colors.bold}  ╭────────────────────────────────────────────────────────────╮
  │   ClayPull 🚀 Ollama HTTPS Tunnel for Deployed App         │
  │   Connects Local Ollama to https://claypull.vercel.app     │
  ╰────────────────────────────────────────────────────────────╯${colors.reset}
`);

process.stdout.write('  [1/2] Verifying local Ollama on port 11434... ');

const req = http.get('http://localhost:11434/api/tags', { timeout: 3000 }, (res) => {
  if (res.statusCode === 200) {
    console.log(`${colors.green}ONLINE!${colors.reset}`);
    startTunnel();
  } else {
    console.log(`${colors.yellow}HTTP ${res.statusCode}${colors.reset}`);
    startTunnel();
  }
});

req.on('error', () => {
  console.log(`${colors.yellow}OFFLINE (Warning)${colors.reset}`);
  console.log(`  ${colors.yellow}Tip: Start Ollama in another terminal with 'ollama serve'${colors.reset}\n`);
  startTunnel();
});

req.on('timeout', () => {
  req.destroy();
  console.log(`${colors.yellow}TIMEOUT${colors.reset}`);
  startTunnel();
});

function startTunnel() {
  console.log(`  [2/2] Launching secure HTTPS tunnel via localtunnel on port 11434...\n`);

  // Run npx localtunnel --port 11434
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['localtunnel', '--port', '11434'], {
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    console.log(text);

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
    if (match) {
      const tunnelUrl = match[0];
      console.log(`
${colors.cyan}${colors.bold}  ══════════════════════════════════════════════════════════════${colors.reset}
  ${colors.green}${colors.bold}✓ HTTPS Tunnel is active!${colors.reset}

  ${colors.bold}Your Ollama HTTPS Endpoint:${colors.reset}
    ${colors.cyan}${colors.bold}${tunnelUrl}${colors.reset}

  ${colors.bold}How to use on https://claypull.vercel.app/:${colors.reset}
    1. Open ${colors.bold}https://claypull.vercel.app/${colors.reset}
    2. Paste ${colors.cyan}${tunnelUrl}${colors.reset} into the ${colors.bold}Endpoint URL${colors.reset} field
    3. Click ${colors.bold}Analyze${colors.reset} — your local Ollama will process the request!
${colors.cyan}${colors.bold}  ══════════════════════════════════════════════════════════════${colors.reset}
`);
    }
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`Tunnel closed with exit code ${code}`);
    }
  });
}
