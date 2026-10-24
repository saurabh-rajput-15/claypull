import type { MCPTarget, MCPToolDefinition } from './types';

export const CLAYPULL_MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'claypull_analyze_repo',
    description: 'Analyze an open-source GitHub repository to extract stack, setup friction index, commands, and contribution rules.',
    parameters: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'GitHub repository in owner/repo or full URL format (e.g. facebook/react)',
        },
        token: {
          type: 'string',
          description: 'Optional GitHub personal access token to raise API rate limits',
        },
      },
      required: ['repo'],
    },
  },
  {
    name: 'claypull_triage_beginner_issues',
    description: 'Find and rank the top 3 beginner-friendly ("good first issue") tickets in a repository with blast radius analysis.',
    parameters: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'GitHub repository (e.g. pallets/flask)',
        },
        skill_level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          default: 'beginner',
          description: 'Contributor experience level',
        },
      },
      required: ['repo'],
    },
  },
  {
    name: 'claypull_generate_pr_plan',
    description: 'Generate a step-by-step fork-to-PR plan with verified file paths for a specific issue number.',
    parameters: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'GitHub repository',
        },
        issue_number: {
          type: 'number',
          description: 'The GitHub issue number to solve',
        },
      },
      required: ['repo', 'issue_number'],
    },
  },
  {
    name: 'claypull_export_agent_prompt',
    description: 'Generate a high-performance master prompt formatted for Claude Code, Antigravity, Cursor, or Codex.',
    parameters: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'GitHub repository' },
        issue_number: { type: 'number', description: 'Issue number' },
        target_agent: {
          type: 'string',
          enum: ['claude-code', 'antigravity', 'cursor', 'codex-copilot', 'aider'],
          description: 'The target AI coding assistant',
        },
      },
      required: ['repo', 'issue_number', 'target_agent'],
    },
  },
];

// Alias for backward compatibility
export const FIRSTPR_MCP_TOOLS = CLAYPULL_MCP_TOOLS;

export function getMCPClientConfig(target: MCPTarget, serverPath = 'c:/Users/saura/Downloads/hacktoberfest/mcp/server.js'): string {
  switch (target) {
    case 'antigravity':
      return JSON.stringify(
        {
          mcpServers: {
            claypull: {
              command: 'node',
              args: [serverPath],
              env: {
                OLLAMA_ENDPOINT: 'http://localhost:11434',
                GITHUB_TOKEN: '',
              },
            },
          },
        },
        null,
        2,
      );

    case 'claude_desktop':
      return JSON.stringify(
        {
          mcpServers: {
            claypull: {
              command: 'node',
              args: [serverPath],
              env: {
                OLLAMA_ENDPOINT: 'http://localhost:11434',
              },
            },
          },
        },
        null,
        2,
      );

    case 'cursor':
      return `# Cursor MCP Settings
# Go to Cursor Settings -> Features -> MCP -> Add New MCP Server
Name: claypull
Type: command
Command: node ${serverPath}
`;

    case 'windsurf':
      return JSON.stringify(
        {
          mcpServers: {
            claypull: {
              command: 'node',
              args: [serverPath],
            },
          },
        },
        null,
        2,
      );
  }
}
