---
name: claypull
description: Open-source contribution coach and AI IDE studio that analyzes a GitHub repository, computes setup friction and blast radius, triages beginner issues, generates master prompts for Claude Code & Antigravity, and exposes native tools via Model Context Protocol (MCP).
---

# ClayPull Agent Skill

ClayPull guides contributors from repo URL to their first successful Pull Request during Hacktoberfest. It runs locally using open-weight models (via Ollama), cloud endpoints, or directly inside AI IDEs via the Model Context Protocol (MCP).

## When to Trigger

Trigger this skill when a user:
- Asks for beginner-friendly ("good first issue") tickets in a repository.
- Wants to contribute to an open-source project but needs to assess setup friction and architecture.
- Needs a surgical contribution plan and list of verified files to modify for an issue.
- Wants a tailored Master Prompt for **Claude Code CLI**, **Google Antigravity**, **Cursor / Windsurf**, or **GitHub Copilot / Codex**.
- Wants to connect an AI IDE to ClayPull using the **Model Context Protocol (MCP)**.
- Wants to compare two AI models side-by-side on their repo analysis and recommendation quality.

## Inputs

| Parameter | Type | Required | Description |
|---|---|---|---|
| `repo` | string | Yes | GitHub repository in `owner/repo` or full URL format (e.g. `facebook/react`) |
| `level` | string | No | Contributor experience level: `beginner` (default), `intermediate`, `advanced` |
| `model` | string | No | Ollama model tag (default: `qwen2.5-coder:7b` or `llama3.2:latest`) |
| `token` | string | No | GitHub personal access token (optional, raises rate limits) |

## Pipeline Execution

### Stage 1: Repo Ingestion & Deep Intelligence
1. Fetch repository metadata, `README.md`, `CONTRIBUTING.md`, and top-level directory tree via GitHub API.
2. Produce structured summary:
   - Purpose & domain
   - Technology stack & test framework detection (Vitest, Jest, Pytest)
   - Setup Friction Score (1-10) and complexity rating
   - Maintainer velocity & welcoming score
   - Local setup & test commands

### Stage 2: Issue Candidate Filtering & Blast Radius Ranking
1. Ingest open issues labeled `good first issue`, `help wanted`, `beginner`, `easy`, `first-timers-only`.
2. Filter out:
   - Issues with assignees or open linked PRs.
   - Stale issues inactive for > 12 months.
3. Score candidates for contributor fit and classify **Blast Radius** (`Low / Isolated` vs `Moderate` vs `Core Architecture`).

### Stage 3: Per-Issue Plan & File Verification
For each selected issue:
1. Explain the problem and expected fix in plain English.
2. Identify likely files to modify, cross-referencing against the fetched directory tree (`verified` vs `guess`).
3. Generate the fork-to-PR checklist adhering to repo conventions.
4. Estimate diff lines and potential risks.

### Stage 4: Master Prompt & MCP Generation
1. Formulate specialized Master Prompts formatted for **Claude Code CLI**, **Google Antigravity**, **Cursor**, **Codex**, and **Aider**.
2. Expose the results as stdio MCP tools (`claypull_analyze_repo`, `claypull_triage_beginner_issues`, `claypull_generate_pr_plan`).

## Web Interfaces & Routes

- `/`: Clay.com landing page with high-level analyzer and comparison mode.
- `/dashboard`: Studio Dashboard featuring deep intelligence metrics, interactive checklist, Master Prompt Studio, and MCP server configuration center.

## Output Schema

```json
{
  "repo": {
    "purpose": "High-level summary of the repository",
    "stack": ["TypeScript", "React"],
    "setupSteps": ["npm install", "npm test"],
    "contributionRules": ["Open issue before PR", "Keep commits atomic"],
    "intelligence": {
      "frictionScore": 2,
      "frictionLabel": "Effortless",
      "maintainerVelocity": "Active · ~48h turnaround",
      "testFramework": "Vitest",
      "setupComplexity": "One-Command",
      "welcomeScore": 94
    }
  },
  "issues": [
    {
      "number": 1234,
      "title": "Fix button focus ring visibility in high-contrast mode",
      "url": "https://github.com/owner/repo/issues/1234",
      "fitScore": 0.94,
      "blastRadius": "Low / Isolated",
      "estimatedDiffLines": "15-25 lines",
      "whyThisOne": "Well-scoped CSS bug with clear reproduction steps",
      "plainExplanation": "Addresses an accessibility issue where keyboard navigation users cannot see active button state.",
      "filesToTouch": [
        { "path": "src/components/Button.tsx", "reason": "Modify button styles", "verified": true }
      ],
      "plan": [
        "Fork repository and clone locally",
        "Create branch fix/button-focus-ring",
        "Update CSS outline in Button.tsx",
        "Run visual regression tests",
        "Open PR referencing #1234"
      ],
      "effort": "30-45 minutes",
      "risks": ["Check dark mode contrast ratio"]
    }
  ]
}
```
