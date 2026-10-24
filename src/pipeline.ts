import type {
  AnalysisResult,
  DeepRepoIntelligence,
  FetchedRepoData,
  LLMConfig,
  ModelComparisonResult,
  RankedIssue,
  RepoSummary,
  SkillLevel,
} from './types';
import { chatCompletion } from './llm';

// ── Prompt builders ──

function detectTreeIntelligence(data: FetchedRepoData): DeepRepoIntelligence {
  const paths = data.tree.map((t) => t.path.toLowerCase());
  const hasDocker = paths.some((p) => p.includes('docker') || p.includes('containerfile'));
  const hasMakefile = paths.some((p) => p.includes('makefile'));
  const hasVitest = paths.some((p) => p.includes('vitest'));
  const hasJest = paths.some((p) => p.includes('jest'));
  const hasPytest = paths.some((p) => p.includes('pytest') || p.includes('conftest.py'));

  let testFramework = 'Test Suite (standard)';
  if (hasVitest) testFramework = 'Vitest';
  else if (hasJest) testFramework = 'Jest';
  else if (hasPytest) testFramework = 'Pytest';

  const setupComplexity: 'One-Command' | 'Multi-Step' | 'Containerized' = hasDocker
    ? 'Containerized'
    : hasMakefile
    ? 'One-Command'
    : 'Multi-Step';

  const frictionScore = setupComplexity === 'One-Command' ? 3 : setupComplexity === 'Containerized' ? 6 : 4;
  const frictionLabel: 'Effortless' | 'Moderate' | 'High Setup Effort' =
    frictionScore <= 3 ? 'Effortless' : frictionScore <= 6 ? 'Moderate' : 'High Setup Effort';

  const topDirs = Array.from(
    new Set(
      data.tree
        .filter((t) => t.type === 'dir' || t.path.includes('/'))
        .map((t) => t.path.split('/')[0])
        .filter((d) => !['node_modules', '.git', 'dist', 'build', '.github'].includes(d)),
    ),
  ).slice(0, 4);

  return {
    frictionScore,
    frictionLabel,
    maintainerVelocity: 'Active · Regular PR turnarounds',
    testFramework,
    setupComplexity,
    hotspotDirectories: topDirs.length > 0 ? topDirs : ['src', 'docs'],
    welcomeScore: Math.min(98, Math.max(70, Math.round(100 - frictionScore * 4))),
  };
}

function buildSummarizePrompt(data: FetchedRepoData): string {
  const treeStr = data.tree.slice(0, 80).map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
  return `You are an expert open-source analyst. Analyze this GitHub repository and produce a JSON summary.

REPOSITORY: ${data.meta.fullName}
DESCRIPTION: ${data.meta.description}
LANGUAGE: ${data.meta.language}
STARS: ${data.meta.stars}

README (truncated):
${data.readme.slice(0, 4000)}

CONTRIBUTING.md:
${data.contributing.slice(0, 2000) || 'Not found.'}

DIRECTORY TREE (top-level):
${treeStr}

Respond with ONLY a valid JSON object matching this schema:
{
  "purpose": "one paragraph describing what this project does",
  "stack": ["technology1", "technology2"],
  "setupSteps": ["step1", "step2"],
  "contributionRules": ["rule1", "rule2"],
  "intelligence": {
    "frictionScore": 3,
    "frictionLabel": "Effortless",
    "maintainerVelocity": "Active · Turnaround ~48h",
    "testFramework": "Vitest / Jest",
    "setupComplexity": "One-Command",
    "welcomeScore": 92
  }
}`;
}

function buildRankPrompt(data: FetchedRepoData, summary: RepoSummary, level: SkillLevel): string {
  const issuesStr = data.issues
    .map(
      (i) =>
        `#${i.number}: "${i.title}" [labels: ${i.labels.join(', ')}] (${i.commentCount} comments, updated ${i.updatedAt})\nBody: ${i.body.slice(0, 500)}`,
    )
    .join('\n\n');

  return `You are an expert at matching open-source issues to contributors.

PROJECT: ${data.meta.fullName}
PURPOSE: ${summary.purpose}
STACK: ${summary.stack.join(', ')}
CONTRIBUTOR SKILL LEVEL: ${level}

CANDIDATE ISSUES:
${issuesStr}

Select the TOP 3 issues most suitable for a "${level}" contributor. Score each 0-1 for fit.

Respond with ONLY a valid JSON object:
{
  "issues": [
    {
      "number": 123,
      "title": "...",
      "url": "https://github.com/${data.meta.fullName}/issues/123",
      "fitScore": 0.9,
      "whyThisOne": "explanation of why this issue is a good fit"
    }
  ]
}

Return exactly 3 issues. If fewer than 3 candidates exist, return what's available.`;
}

function buildPlanPrompt(
  data: FetchedRepoData,
  summary: RepoSummary,
  issue: { number: number; title: string; whyThisOne: string },
  level: SkillLevel,
): string {
  const issueData = data.issues.find((i) => i.number === issue.number);
  const treeStr = data.tree.slice(0, 60).map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
  const treePaths = new Set(data.tree.map((f) => f.path));

  return `You are a mentor helping a "${level}" contributor make their first PR.

PROJECT: ${data.meta.fullName}
PURPOSE: ${summary.purpose}
STACK: ${summary.stack.join(', ')}
CONTRIBUTION RULES: ${summary.contributionRules.join('; ')}

ISSUE #${issue.number}: "${issue.title}"
BODY: ${issueData?.body || 'No body'}
WHY SELECTED: ${issue.whyThisOne}

FILE TREE (use ONLY these paths):
${treeStr}

Available paths for verification: ${JSON.stringify([...treePaths].slice(0, 100))}

Respond with ONLY a valid JSON object:
{
  "plainExplanation": "What this issue asks for and why it matters, in simple terms",
  "blastRadius": "Low / Isolated",
  "estimatedDiffLines": "15-30 lines",
  "filesToTouch": [
    {"path": "src/example.ts", "reason": "This file contains...", "verified": true}
  ],
  "plan": [
    "Fork the repository on GitHub",
    "Clone: git clone ...",
    "Create branch: git checkout -b fix-issue-${issue.number}",
    "..."
  ],
  "effort": "1-2 hours",
  "risks": ["Possible risk 1"]
}

IMPORTANT: For filesToTouch, set "verified" to true ONLY if the path exists in the file tree above. Otherwise set it to false and mark the path as a guess.`;
}

// ── JSON parsing with repair ──

function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    const cleaned = jsonStr
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    return JSON.parse(cleaned);
  }
}

// ── Pipeline ──

export async function runPipeline(
  repoData: FetchedRepoData,
  level: SkillLevel,
  config: LLMConfig,
  onProgress?: (stage: string, message: string) => void,
): Promise<AnalysisResult> {
  const startTime = performance.now();
  const treeIntel = detectTreeIntelligence(repoData);

  // Stage 1: Summarize
  onProgress?.('summarizing', 'Analyzing repository architecture and setup friction…');
  const summaryRaw = await chatCompletion(
    config,
    [
      { role: 'system', content: 'You are a helpful assistant that responds only in valid JSON.' },
      { role: 'user', content: buildSummarizePrompt(repoData) },
    ],
  );
  let summary: RepoSummary;
  try {
    summary = parseJSON<RepoSummary>(summaryRaw);
  } catch {
    const retryRaw = await chatCompletion(config, [
      { role: 'system', content: 'Fix the following into valid JSON. Return ONLY the JSON.' },
      { role: 'user', content: summaryRaw },
    ]);
    summary = parseJSON<RepoSummary>(retryRaw);
  }

  // Ensure required fields and merge deep intelligence
  summary = {
    purpose: summary.purpose || repoData.meta.description || 'No description available',
    stack: summary.stack && summary.stack.length > 0 ? summary.stack : [repoData.meta.language],
    setupSteps: summary.setupSteps || [],
    contributionRules: summary.contributionRules || [],
    intelligence: summary.intelligence ? { ...treeIntel, ...summary.intelligence } : treeIntel,
  };

  if (repoData.issues.length === 0) {
    return {
      repo: summary,
      issues: [],
      latencyMs: Math.round(performance.now() - startTime),
      modelUsed: config.model,
    };
  }

  // Stage 2: Rank issues
  onProgress?.('ranking', 'Evaluating candidate issues and blast radius…');
  const rankRaw = await chatCompletion(
    config,
    [
      { role: 'system', content: 'You are a helpful assistant that responds only in valid JSON.' },
      { role: 'user', content: buildRankPrompt(repoData, summary, level) },
    ],
  );
  let ranked: { issues: Array<{ number: number; title: string; url: string; fitScore: number; whyThisOne: string }> };
  try {
    ranked = parseJSON(rankRaw);
  } catch {
    const retryRaw = await chatCompletion(config, [
      { role: 'system', content: 'Fix the following into valid JSON. Return ONLY the JSON.' },
      { role: 'user', content: rankRaw },
    ]);
    ranked = parseJSON(retryRaw);
  }

  if (!ranked.issues || ranked.issues.length === 0) {
    return {
      repo: summary,
      issues: [],
      latencyMs: Math.round(performance.now() - startTime),
      modelUsed: config.model,
    };
  }

  // Stage 3: Plan for each issue
  onProgress?.('planning', 'Synthesizing PR plans & AI agent instructions…');
  const fullIssues: RankedIssue[] = [];

  for (const rankedIssue of ranked.issues.slice(0, 3)) {
    onProgress?.('planning', `Planning issue #${rankedIssue.number}: ${rankedIssue.title}…`);
    const planRaw = await chatCompletion(
      config,
      [
        { role: 'system', content: 'You are a helpful assistant that responds only in valid JSON.' },
        { role: 'user', content: buildPlanPrompt(repoData, summary, rankedIssue, level) },
      ],
    );
    let plan: {
      plainExplanation: string;
      blastRadius?: 'Low / Isolated' | 'Moderate' | 'Core Architecture';
      estimatedDiffLines?: string;
      filesToTouch: Array<{ path: string; reason: string; verified: boolean }>;
      plan: string[];
      effort: string;
      risks: string[];
    };
    try {
      plan = parseJSON(planRaw);
    } catch {
      const retryRaw = await chatCompletion(config, [
        { role: 'system', content: 'Fix the following into valid JSON. Return ONLY the JSON.' },
        { role: 'user', content: planRaw },
      ]);
      plan = parseJSON(retryRaw);
    }

    // Verify file paths against tree
    const treePaths = new Set(repoData.tree.map((f) => f.path));
    const filesToTouch = (plan.filesToTouch || []).map((f) => ({
      ...f,
      verified: treePaths.has(f.path),
    }));

    fullIssues.push({
      number: rankedIssue.number,
      title: rankedIssue.title,
      url: rankedIssue.url || `https://github.com/${repoData.meta.fullName}/issues/${rankedIssue.number}`,
      fitScore: rankedIssue.fitScore || 0,
      whyThisOne: rankedIssue.whyThisOne || '',
      plainExplanation: plan.plainExplanation || '',
      blastRadius: plan.blastRadius || 'Low / Isolated',
      estimatedDiffLines: plan.estimatedDiffLines || '15-30 lines',
      filesToTouch,
      plan: plan.plan || [],
      effort: plan.effort || 'Unknown',
      risks: plan.risks || [],
    });
  }

  return {
    repo: summary,
    issues: fullIssues,
    latencyMs: Math.round(performance.now() - startTime),
    modelUsed: config.model,
  };
}

/**
 * Compare two models side-by-side on the same repository (FR-21).
 */
export async function runModelComparison(
  repoData: FetchedRepoData,
  level: SkillLevel,
  configA: LLMConfig,
  configB: LLMConfig,
  onProgress?: (model: 'A' | 'B', stage: string, message: string) => void,
): Promise<ModelComparisonResult> {
  const startA = performance.now();
  const resultA = await runPipeline(repoData, level, configA, (stage, msg) => onProgress?.('A', stage, msg));
  const latencyA = Math.round(performance.now() - startA);

  const startB = performance.now();
  const resultB = await runPipeline(repoData, level, configB, (stage, msg) => onProgress?.('B', stage, msg));
  const latencyB = Math.round(performance.now() - startB);

  return {
    modelA: { config: configA, result: resultA, latencyMs: latencyA },
    modelB: { config: configB, result: resultB, latencyMs: latencyB },
  };
}
