import type { AnalysisResult, RankedIssue, MasterPrompt } from './types';

/**
 * Generates tailored Master Prompts for modern AI coding tools
 * (Claude Code, Antigravity, Codex / Copilot, Cursor, Windsurf, Aider).
 */
export function generateMasterPrompts(
  repoName: string,
  analysis: AnalysisResult,
  selectedIssue: RankedIssue,
): MasterPrompt[] {
  const cleanRepo = repoName.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const repo = analysis.repo;
  const filesList = selectedIssue.filesToTouch
    .map((f) => `- \`${f.path}\`: ${f.reason} (${f.verified ? 'verified in tree' : 'suggested'})`)
    .join('\n');
  const planList = selectedIssue.plan.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
  const rulesList = repo.contributionRules.map((r) => `- ${r}`).join('\n') || '- Follow standard Git branching practices';
  const setupCmds = repo.setupSteps.join('\n') || '# Refer to repo README for local setup';

  // 1. Claude Code
  const claudeCodePrompt = `You are solving GitHub Issue #${selectedIssue.number} in repository ${cleanRepo}.

ISSUE CONTEXT:
Title: ${selectedIssue.title}
Link: ${selectedIssue.url}
Explanation: ${selectedIssue.plainExplanation}

RECOMMENDED TARGET FILES:
${filesList}

STEP-BY-STEP IMPLEMENTATION PLAN:
${planList}

CONTRIBUTION & REPO RULES:
${rulesList}

SETUP & TEST COMMANDS:
${setupCmds}

TASK INSTRUCTIONS:
1. Examine the target files above. Do NOT make broad refactorings.
2. Implement a surgical fix that addresses this specific issue only.
3. Run test suites to verify no regressions were introduced.
4. Prepare git commit following conventional commits format.`;

  const claudeCodeCli = `claude "Resolve issue #${selectedIssue.number} (${selectedIssue.title.replace(/"/g, '\\"')}). Focus surgically on files: ${selectedIssue.filesToTouch.map((f) => f.path).join(', ')}. Run tests before completing."`;

  // 2. Google Antigravity
  const antigravityPrompt = `<TASK>
Solve beginner issue #${selectedIssue.number} in repository \`${cleanRepo}\`: "${selectedIssue.title}"
Issue Link: ${selectedIssue.url}
</TASK>

<REPO_CONTEXT>
Purpose: ${repo.purpose}
Tech Stack: ${repo.stack.join(', ')}
Contribution Conventions:
${rulesList}
</REPO_CONTEXT>

<OBJECTIVE_AND_EXPLANATION>
${selectedIssue.plainExplanation}
Why selected: ${selectedIssue.whyThisOne}
Estimated Effort: ${selectedIssue.effort}
</OBJECTIVE_AND_EXPLANATION>

<SURGICAL_TARGET_FILES>
${filesList}
</SURGICAL_TARGET_FILES>

<EXECUTION_PLAN>
${planList}
</EXECUTION_PLAN>

<VERIFICATION_CRITERIA>
1. Code compiles without errors or lint warnings.
2. Existing test suite passes without regression.
3. Any newly added logic has a corresponding test case.
4. Minimal code footprint: touched lines trace directly to issue #${selectedIssue.number}.
</VERIFICATION_CRITERIA>`;

  // 3. GitHub Copilot / OpenAI Codex
  const codexPrompt = `/*
 * Task: Fix #${selectedIssue.number} - ${selectedIssue.title}
 * Repository: ${cleanRepo}
 * URL: ${selectedIssue.url}
 *
 * Problem Description:
 * ${selectedIssue.plainExplanation}
 *
 * Modified Files:
 * ${selectedIssue.filesToTouch.map((f) => `* - ${f.path}`).join('\n')}
 *
 * Rules:
 * - Keep modifications localized and backwards compatible.
 * - Adhere to existing formatting and variable naming conventions.
 */

// Step 1: Follow reproduction steps
// Step 2: Implement fix in target file
// Step 3: Run existing tests`;

  // 4. Cursor & Windsurf
  const cursorPrompt = `# Context: Issue #${selectedIssue.number} in ${cleanRepo}
URL: ${selectedIssue.url}

## Task Summary
${selectedIssue.plainExplanation}

## Focus Files:
${selectedIssue.filesToTouch.map((f) => `@${f.path}`).join(' ')}

## Step-by-Step Instructions:
${planList}

## Constraints:
- Adhere strictly to the project style: ${repo.stack.join(', ')}
- Only modify what is needed for issue #${selectedIssue.number}
- Run tests and verify before opening PR`;

  // 5. Aider
  const aiderPrompt = `/add ${selectedIssue.filesToTouch.map((f) => f.path).join(' ')}
Fix issue #${selectedIssue.number}: "${selectedIssue.title}".
Context: ${selectedIssue.plainExplanation}
Ensure all tests pass and changes are minimal.`;

  const aiderCli = `aider ${selectedIssue.filesToTouch.map((f) => f.path).join(' ')} --message "Fix issue #${selectedIssue.number}: ${selectedIssue.title.replace(/"/g, '\\"')}"`;

  return [
    {
      id: 'claude-code',
      title: 'Claude Code CLI',
      badge: 'Anthropic',
      description: 'One-command shell invocation or deep context prompt for Anthropic Claude Code CLI.',
      cliCommand: claudeCodeCli,
      prompt: claudeCodePrompt,
    },
    {
      id: 'antigravity',
      title: 'Google Antigravity',
      badge: 'DeepMind AGY',
      description: 'Structured prompt with surgical edit boundaries and verification loops for Antigravity agents.',
      prompt: antigravityPrompt,
    },
    {
      id: 'cursor',
      title: 'Cursor / Windsurf',
      badge: 'AI IDE',
      description: 'Context-injected prompt with @file annotations and guardrails for modern AI IDEs.',
      prompt: cursorPrompt,
    },
    {
      id: 'codex-copilot',
      title: 'GitHub Copilot / Codex',
      badge: 'Inline AI',
      description: 'Header docstring and localized completion prompt for Copilot Chat & OpenAI Codex.',
      prompt: codexPrompt,
    },
    {
      id: 'aider',
      title: 'Aider Git Pair',
      badge: 'Terminal Pair',
      description: 'Ready-to-run terminal command with file additions for Aider command-line pair programmer.',
      cliCommand: aiderCli,
      prompt: aiderPrompt,
    },
  ];
}
