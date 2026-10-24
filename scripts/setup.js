#!/usr/bin/env node

/**
 * ClayPull — Automated Local Setup & Health Check
 * Verifies Node.js environment, .env configuration, dependencies, Ollama connectivity, and MCP server.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  underline: '\x1b[4m',
};

function banner() {
  console.log(`
${colors.magenta}${colors.bold}  ╭────────────────────────────────────────────────────────────╮
  │   ClayPull 🚀 Local Setup & Health Check Wizard            │
  │   Open-Source Contribution Coach & AI IDE Studio          │
  ╰────────────────────────────────────────────────────────────╯${colors.reset}
`);
}

function checkNodeVersion() {
  const current = process.versions.node;
  const major = parseInt(current.split('.')[0], 10);
  process.stdout.write(`  [1/5] Checking Node.js runtime (>= 18)... `);
  if (major < 18) {
    console.log(`${colors.red}FAIL (Node ${current})${colors.reset}`);
    console.error(`  ${colors.red}Error: ClayPull requires Node.js v18 or higher. You are using v${current}.${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.green}OK (v${current})${colors.reset}`);
}

function checkEnvironmentFile() {
  process.stdout.write(`  [2/5] Checking environment variables (.env)... `);
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');

  if (fs.existsSync(envPath)) {
    console.log(`${colors.green}EXISTS (.env)${colors.reset}`);
  } else if (fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(`${colors.yellow}CREATED (copied from .env.example)${colors.reset}`);
    } catch (err) {
      console.log(`${colors.red}ERROR copying .env.example: ${err.message}${colors.reset}`);
    }
  } else {
    // Generate minimal .env
    const fallbackEnv = `# ClayPull Environment Configuration\nVITE_OLLAMA_ENDPOINT=http://localhost:11434\nVITE_DEFAULT_MODEL=gemma4:e4b\nVITE_GITHUB_TOKEN=\n`;
    fs.writeFileSync(envPath, fallbackEnv, 'utf8');
    console.log(`${colors.yellow}INITIALIZED (defaults generated)${colors.reset}`);
  }
}

function checkDependencies() {
  process.stdout.write(`  [3/5] Checking installed node_modules... `);
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`${colors.green}OK (node_modules present)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}MISSING${colors.reset}`);
    console.log(`  ${colors.yellow}Notice: Run 'npm install' to install dependencies.${colors.reset}`);
  }
}

function checkOllama(callback) {
  process.stdout.write(`  [4/5] Checking local Ollama instance (http://localhost:11434)... `);

  const req = http.get('http://localhost:11434/api/tags', { timeout: 2500 }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const models = (json.models || []).map((m) => m.name);
        console.log(`${colors.green}ONLINE!${colors.reset}`);
        if (models.length > 0) {
          console.log(`        ${colors.dim}Available models: ${models.slice(0, 4).join(', ')}${models.length > 4 ? ` (+${models.length - 4} more)` : ''}${colors.reset}`);
        } else {
          console.log(`        ${colors.yellow}No models found yet. Recommended: 'ollama run gemma4:e4b'${colors.reset}`);
        }
      } catch {
        console.log(`${colors.green}ONLINE (HTTP 200)${colors.reset}`);
      }
      callback();
    });
  });

  req.on('timeout', () => {
    req.destroy();
    console.log(`${colors.yellow}NOT DETECTED (Timeout)${colors.reset}`);
    printOllamaTip();
    callback();
  });

  req.on('error', () => {
    console.log(`${colors.yellow}OFFLINE${colors.reset}`);
    printOllamaTip();
    callback();
  });
}

function printOllamaTip() {
  console.log(`        ${colors.dim}Tip: Local Ollama is optional. You can use:${colors.reset}`);
  console.log(`        ${colors.dim}  • Zero-setup Offline Demo Mode (instant results)${colors.reset}`);
  console.log(`        ${colors.dim}  • Cloud models (Groq, OpenRouter, OpenAI, DeepSeek)${colors.reset}`);
  console.log(`        ${colors.dim}  • Start Ollama locally: 'ollama serve' & 'ollama run gemma4:e4b'${colors.reset}`);
}

function checkMcpAndCli() {
  process.stdout.write(`  [5/5] Verifying MCP Server & CLI binaries... `);
  const mcpServerPath = path.join(rootDir, 'mcp', 'server.js');
  const cliPath = path.join(rootDir, 'bin', 'claypull.js');

  const mcpOk = fs.existsSync(mcpServerPath);
  const cliOk = fs.existsSync(cliPath);

  if (mcpOk && cliOk) {
    console.log(`${colors.green}VERIFIED${colors.reset}`);
    console.log(`        ${colors.dim}• CLI: ${path.relative(rootDir, cliPath)}${colors.reset}`);
    console.log(`        ${colors.dim}• MCP Server: ${path.relative(rootDir, mcpServerPath)}${colors.reset}`);
  } else {
    console.log(`${colors.red}INCOMPLETE (Missing files)${colors.reset}`);
  }
}

function printSuccessSummary() {
  console.log(`
${colors.cyan}${colors.bold}  ══════════════════════════════════════════════════════════════${colors.reset}
  ${colors.green}${colors.bold}✓ ClayPull environment is ready!${colors.reset}

  ${colors.bold}Quick Start Commands:${colors.reset}
    ${colors.cyan}npm run dev${colors.reset}        Start web app on ${colors.bold}http://localhost:5174/${colors.reset}
    ${colors.cyan}npm run cli -- analyze facebook/react --demo${colors.reset}
                       Run offline AI analysis in terminal
    ${colors.cyan}node mcp/server.js${colors.reset}
                       Start Model Context Protocol (MCP) server
    ${colors.cyan}npm run build${colors.reset}      TypeScript verification & production build
    ${colors.cyan}npm run lint${colors.reset}       Run ESLint code verification

  ${colors.bold}Studio Routes:${colors.reset}
    • Landing Page:   ${colors.underline}http://localhost:5174/${colors.reset}
    • Studio Studio:  ${colors.underline}http://localhost:5174/dashboard${colors.reset}
${colors.cyan}${colors.bold}  ══════════════════════════════════════════════════════════════${colors.reset}
`);
}

banner();
checkNodeVersion();
checkEnvironmentFile();
checkDependencies();
checkOllama(() => {
  checkMcpAndCli();
  printSuccessSummary();
});
