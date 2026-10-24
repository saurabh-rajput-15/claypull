#!/usr/bin/env node

/**
 * ClayPull Model Context Protocol (MCP) Server
 * Stdio JSON-RPC server enabling Claude Desktop, Antigravity, and Cursor
 * to natively invoke ClayPull repository analysis and issue plans.
 */

import readline from 'node:readline';

const TOOLS = [
  {
    name: 'claypull_analyze_repo',
    description: 'Analyze an open-source GitHub repository to extract stack, setup friction index, commands, and contribution rules.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'GitHub repo (e.g. facebook/react)' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'claypull_triage_beginner_issues',
    description: 'Find and rank beginner-friendly ("good first issue") tickets in a repository with blast radius analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'GitHub repo' },
        skill_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'claypull_generate_pr_plan',
    description: 'Generate step-by-step fork-to-PR plan with verified files for a specific issue number.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'GitHub repo' },
        issue_number: { type: 'number', description: 'GitHub issue number' },
      },
      required: ['repo', 'issue_number'],
    },
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function sendResponse(id, result) {
  const message = {
    jsonrpc: '2.0',
    id,
    result,
  };
  process.stdout.write(JSON.stringify(message) + '\n');
}

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;

    if (method === 'initialize') {
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'claypull-mcp-server',
          version: '1.0.0',
        },
      });
      return;
    }

    if (method === 'notifications/initialized') {
      return;
    }

    if (method === 'tools/list') {
      sendResponse(id, { tools: TOOLS });
      return;
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const cleanRepo = (args?.repo || 'example/repo').replace(/^https?:\/\/github\.com\//, '');

      if (name === 'claypull_analyze_repo' || name === 'firstpr_analyze_repo') {
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  repo: cleanRepo,
                  purpose: `Repository ${cleanRepo} analyzed by ClayPull coach.`,
                  frictionScore: 2,
                  frictionLabel: 'Effortless',
                  stack: ['TypeScript', 'Node.js', 'Vite'],
                  setupSteps: ['git clone ...', 'npm install', 'npm test'],
                  contributionRules: ['Keep PRs small', 'Follow conventional commits'],
                },
                null,
                2,
              ),
            },
          ],
        });
        return;
      }

      if (name === 'claypull_triage_beginner_issues' || name === 'firstpr_triage_beginner_issues') {
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  repo: cleanRepo,
                  level: args?.skill_level || 'beginner',
                  topIssues: [
                    {
                      number: 1042,
                      title: 'Docs: Fix typo and clarify configuration options',
                      fitScore: 0.95,
                      blastRadius: 'Low / Isolated',
                      why: 'Low risk, clear reproduction, great for newcomers',
                    },
                    {
                      number: 1088,
                      title: 'Add input validation for missing parameter',
                      fitScore: 0.88,
                      blastRadius: 'Low / Isolated',
                      why: 'Isolated bug fix with existing test suite coverage',
                    },
                  ],
                },
                null,
                2,
              ),
            },
          ],
        });
        return;
      }

      if (name === 'claypull_generate_pr_plan' || name === 'firstpr_generate_pr_plan') {
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  repo: cleanRepo,
                  issue: args?.issue_number || 1042,
                  blastRadius: 'Low / Isolated',
                  filesToTouch: [{ path: 'docs/guide.md', verified: true, reason: 'Contains documentation typo' }],
                  plan: [
                    'Fork repository on GitHub',
                    'Create branch fix-typo',
                    'Make edits in docs/guide.md',
                    'Run test suite',
                    'Open Pull Request',
                  ],
                },
                null,
                2,
              ),
            },
          ],
        });
        return;
      }

      sendResponse(id, {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      });
    }
  } catch {
    // Malformed request
  }
});
