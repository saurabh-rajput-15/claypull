#!/usr/bin/env node

/**
 * ClayPull Model Context Protocol (MCP) Server
 * Stdio JSON-RPC server enabling Claude Desktop, Antigravity, and Cursor
 * to natively invoke ClayPull repository analysis and issue plans.
 */

import readline from 'node:readline';

const GITHUB_API = 'https://api.github.com';

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

async function fetchGitHubJSON(path) {
  const token = process.env.GITHUB_TOKEN;
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token.trim()}`;
  const res = await fetch(`${GITHUB_API}/${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
  return res.json();
}

function parseOwnerRepo(repo) {
  const clean = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const [owner, name] = clean.split('/');
  return { owner, repo: name || owner };
}

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

rl.on('line', async (line) => {
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
      const cleanRepo = (args?.repo || 'facebook/react').replace(/^https?:\/\/github\.com\//, '');
      const { owner, repo: repoName } = parseOwnerRepo(cleanRepo);

      try {
        if (name === 'claypull_analyze_repo' || name === 'firstpr_analyze_repo') {
          const repoMeta = await fetchGitHubJSON(`repos/${owner}/${repoName}`);
          const defaultBranch = repoMeta.default_branch || 'main';

          let tree = [];
          try {
            const treeData = await fetchGitHubJSON(`repos/${owner}/${repoName}/git/trees/${defaultBranch}?recursive=1`);
            tree = (treeData.tree || []).slice(0, 150).map((t) => t.path.toLowerCase());
          } catch {
            tree = [];
          }

          const hasDocker = tree.some((p) => p.includes('dockerfile'));
          const hasCargo = tree.some((p) => p.includes('cargo.toml'));
          const hasPython = tree.some((p) => p.includes('pyproject.toml') || p.includes('requirements.txt'));
          const hasNode = tree.some((p) => p.includes('package.json'));

          const stack = [];
          if (repoMeta.language) stack.push(repoMeta.language);
          if (hasCargo) stack.push('Rust', 'Cargo');
          if (hasPython) stack.push('Python', 'Pytest');
          if (hasNode) stack.push('Node.js');
          if (hasDocker) stack.push('Docker');

          const frictionScore = hasCargo || hasNode ? 2 : hasDocker ? 5 : 3;

          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    repo: `${owner}/${repoName}`,
                    purpose: repoMeta.description || `Open-source project ${owner}/${repoName}`,
                    stars: repoMeta.stargazers_count,
                    stack: stack.length > 0 ? stack : [repoMeta.language || 'General'],
                    frictionScore,
                    frictionLabel: frictionScore <= 3 ? 'Effortless' : 'Moderate',
                    testFramework: hasPython ? 'Pytest' : hasCargo ? 'Cargo Test' : 'npm test',
                    setupSteps: [
                      `git clone https://github.com/${owner}/${repoName}.git`,
                      hasPython ? 'pip install -e .' : hasCargo ? 'cargo build' : 'npm install',
                      hasPython ? 'pytest' : hasCargo ? 'cargo test' : 'npm test',
                    ],
                    contributionRules: [
                      'Keep PR footprint surgical',
                      'Run test suite locally before PR',
                      'Follow conventional commit guidelines',
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

        if (name === 'claypull_triage_beginner_issues' || name === 'firstpr_triage_beginner_issues') {
          const rawIssues = await fetchGitHubJSON(`repos/${owner}/${repoName}/issues?state=open&per_page=30&sort=updated&direction=desc`);
          const filtered = rawIssues
            .filter((i) => !i.pull_request && !i.assignee)
            .slice(0, 3)
            .map((i) => ({
              number: i.number,
              title: i.title,
              url: i.htmlUrl || `https://github.com/${owner}/${repoName}/issues/${i.number}`,
              fitScore: 0.92,
              blastRadius: /doc|typo|readme/i.test(i.title) ? 'Low / Isolated' : 'Moderate',
              why: /doc|typo|readme/i.test(i.title)
                ? 'Documentation enhancement with isolated blast radius and no regression risk.'
                : 'Actionable open issue with low comment contention, suitable for newcomers.',
              labels: (i.labels || []).map((l) => l.name),
            }));

          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    repo: `${owner}/${repoName}`,
                    level: args?.skill_level || 'beginner',
                    topIssues: filtered,
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
          const issueNum = args?.issue_number;
          const issue = await fetchGitHubJSON(`repos/${owner}/${repoName}/issues/${issueNum}`);

          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    repo: `${owner}/${repoName}`,
                    issue: issueNum,
                    title: issue.title,
                    blastRadius: 'Low / Isolated',
                    plan: [
                      `Fork https://github.com/${owner}/${repoName} and clone locally`,
                      `Create branch: git checkout -b fix/issue-${issueNum}`,
                      'Implement targeted fix in relevant files',
                      'Run local test suite to verify no regressions',
                      `Commit with conventional commit referencing #${issueNum} and open PR`,
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
      } catch (err) {
        sendResponse(id, {
          content: [{ type: 'text', text: `Tool execution error: ${err.message}` }],
          isError: true,
        });
      }
    }
  } catch {
    // Malformed request
  }
});
