import type {
  AnalysisResult,
  FetchedRepoData,
  LLMConfig,
  ModelComparisonResult,
  RankedIssue,
  RepoSummary,
  SkillLevel,
} from './types';
import { chatCompletion } from './llm';
import {
  analyzeRepoHeuristic,
  detectDeepIntelligence,
  detectStack,
  extractContributionRules,
  extractSetupSteps,
  synthesizeContributionOpportunities,
} from './deepAnalyzer';

// ── Prompt builders ──

function buildSummarizePrompt(data: FetchedRepoData, stack: string[]): string {
  const treeStr = data.tree.slice(0, 100).map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
  return `You are a Principal Open-Source Architect. Analyze this GitHub repository and produce an accurate JSON architecture overview.

REPOSITORY: ${data.meta.fullName}
DESCRIPTION: ${data.meta.description || 'No description provided'}
PRIMARY LANGUAGE: ${data.meta.language}
STARS: ${data.meta.stars}
DETECTED STACK: ${stack.join(', ')}

README EXCERPT:
${data.readme.slice(0, 4000)}

CONTRIBUTING.MD EXCERPT:
${data.contributing.slice(0, 2500) || 'None provided'}

TOP DIRECTORY TREE:
${treeStr}

Respond with ONLY a valid JSON object matching this schema:
{
  "purpose": "A concise 2-sentence description of what this project does and its core value proposition",
  "stack": ["technology1", "technology2"],
  "setupSteps": ["step1", "step2"],
  "contributionRules": ["rule1", "rule2"]
}`;
}

function buildRankPrompt(data: FetchedRepoData, summary: RepoSummary, level: SkillLevel): string {
  const issuesStr = data.issues
    .slice(0, 15)
    .map(
      (i) =>
        `#${i.number}: "${i.title}" [labels: ${i.labels.join(', ')}] (${i.commentCount} comments, updated ${i.updatedAt})\nBody excerpt: ${i.body.slice(0, 400).replace(/\r?\n/g, ' ')}`,
    )
    .join('\n\n');

  return `You are an expert open-source triage lead matching issues to contributors.

PROJECT: ${data.meta.fullName}
PURPOSE: ${summary.purpose}
STACK: ${summary.stack.join(', ')}
CONTRIBUTOR SKILL LEVEL: ${level}

CANDIDATE REPO ISSUES:
${issuesStr}

Task: Select the TOP 3 issues most suitable for a "${level}" contributor.
Score each candidate from 0.70 to 0.98 for fit. Prioritize issues with clear scope, low contention, and isolated blast radius.

Respond with ONLY a valid JSON object:
{
  "issues": [
    {
      "number": 123,
      "title": "Title matching one of candidate issues",
      "url": "https://github.com/${data.meta.fullName}/issues/123",
      "fitScore": 0.94,
      "whyThisOne": "Explanation of why this issue is ideal for a ${level} contributor"
    }
  ]
}

Return up to 3 issues. Use ONLY issue numbers that exist in the candidate list above.`;
}

function buildPlanPrompt(
  data: FetchedRepoData,
  summary: RepoSummary,
  issue: { number: number; title: string; whyThisOne: string },
  level: SkillLevel,
): string {
  const issueData = data.issues.find((i) => i.number === issue.number);
  const treeStr = data.tree.slice(0, 80).map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n');
  const treePaths = new Set(data.tree.map((f) => f.path));

  return `You are a Staff Engineer mentoring a "${level}" contributor on their first PR.

PROJECT: ${data.meta.fullName}
STACK: ${summary.stack.join(', ')}
CONTRIBUTION RULES: ${summary.contributionRules.join('; ')}

ISSUE #${issue.number}: "${issue.title}"
ISSUE BODY: ${issueData?.body?.slice(0, 1500) || issue.title}
REASON SELECTED: ${issue.whyThisOne}

AVAILABLE DIRECTORY TREE:
${treeStr}

Verification list: ${JSON.stringify([...treePaths].slice(0, 100))}

Respond with ONLY a valid JSON object:
{
  "plainExplanation": "Clear, non-jargon explanation of what this issue requires and why it matters",
  "blastRadius": "Low / Isolated",
  "estimatedDiffLines": "15-30 lines",
  "filesToTouch": [
    {"path": "actual/file/from/tree.ext", "reason": "Explanation of why this file is modified", "verified": true}
  ],
  "plan": [
    "Fork and clone repository",
    "git checkout -b fix/issue-${issue.number}",
    "Locate and edit target file",
    "Run tests locally",
    "Commit with conventional commit and open PR"
  ],
  "effort": "30-60 minutes",
  "risks": ["Specific edge cases or tests to watch out for"]
}

CRITICAL: For filesToTouch, use file paths that exist in the AVAILABLE DIRECTORY TREE above whenever possible.`;
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

// ── Pipeline Execution ──

export async function runPipeline(
  repoData: FetchedRepoData,
  level: SkillLevel,
  config: LLMConfig,
  onProgress?: (stage: string, message: string) => void,
): Promise<AnalysisResult> {
  const startTime = performance.now();

  // If user selected deep heuristic / instant offline mode, run deterministic static analyzer directly
  if (config.provider === 'mock-demo' || config.provider === 'deep-heuristic') {
    onProgress?.('summarizing', 'Scanning repository architecture, stack manifests, and file tree…');
    await new Promise((resolve) => setTimeout(resolve, 350));
    onProgress?.('ranking', 'Triaging candidate issues and calculating blast radius…');
    await new Promise((resolve) => setTimeout(resolve, 300));
    onProgress?.('planning', 'Synthesizing fork-to-PR blueprints with verified files…');
    await new Promise((resolve) => setTimeout(resolve, 300));
    return analyzeRepoHeuristic(repoData, level);
  }

  // Pre-calculate real stack and deep intelligence from actual repo tree
  const detectedStack = detectStack(repoData);
  const deepIntel = detectDeepIntelligence(repoData);
  const fallbackSetup = extractSetupSteps(repoData, detectedStack);
  const fallbackRules = extractContributionRules(repoData);

  try {
    // ── Stage 1: Summarize ──
    onProgress?.('summarizing', `Analyzing repository architecture via ${config.model}…`);
    let summary: RepoSummary;

    try {
      const summaryRaw = await chatCompletion(
        config,
        [
          { role: 'system', content: 'You are a staff open-source engineer. Return ONLY a valid JSON object.' },
          { role: 'user', content: buildSummarizePrompt(repoData, detectedStack) },
        ],
      );
      summary = parseJSON<RepoSummary>(summaryRaw);
    } catch {
      // Retry once with repair prompt
      try {
        const retryRaw = await chatCompletion(config, [
          { role: 'system', content: 'Convert the following text into valid JSON only.' },
          { role: 'user', content: buildSummarizePrompt(repoData, detectedStack) },
        ]);
        summary = parseJSON<RepoSummary>(retryRaw);
      } catch {
        // Fallback to static intelligence
        summary = {
          purpose: repoData.meta.description || `Open-source ${detectedStack.join('/')} project on GitHub.`,
          stack: detectedStack,
          setupSteps: fallbackSetup,
          contributionRules: fallbackRules,
          intelligence: deepIntel,
        };
      }
    }

    // Ensure fields are populated and accurate
    summary = {
      purpose: summary.purpose || repoData.meta.description || `Open-source project ${repoData.meta.fullName}`,
      stack: summary.stack && summary.stack.length > 0 ? summary.stack : detectedStack,
      setupSteps: summary.setupSteps && summary.setupSteps.length > 0 ? summary.setupSteps : fallbackSetup,
      contributionRules: summary.contributionRules && summary.contributionRules.length > 0 ? summary.contributionRules : fallbackRules,
      intelligence: deepIntel,
    };

    // ── If repo has 0 candidate issues, synthesize real contribution opportunities ──
    if (repoData.issues.length === 0) {
      onProgress?.('planning', 'Synthesizing verified repository contribution tracks…');
      const synthesized = synthesizeContributionOpportunities(repoData, summary, level);
      return {
        repo: summary,
        issues: synthesized,
        latencyMs: Math.round(performance.now() - startTime),
        modelUsed: `${config.model} + Deep Static Engine`,
      };
    }

    // ── Stage 2: Rank Issues ──
    onProgress?.('ranking', `Evaluating issues & blast radius via ${config.model}…`);
    let rankedIssuesList: Array<{ number: number; title: string; url?: string; fitScore?: number; whyThisOne?: string }> = [];

    try {
      const rankRaw = await chatCompletion(
        config,
        [
          { role: 'system', content: 'You are an open-source mentor. Return ONLY a valid JSON object.' },
          { role: 'user', content: buildRankPrompt(repoData, summary, level) },
        ],
      );
      const parsedRank = parseJSON<{ issues: Array<{ number: number; title: string; url?: string; fitScore?: number; whyThisOne?: string }> }>(rankRaw);
      rankedIssuesList = parsedRank.issues || [];
    } catch {
      // Fallback: pick top 3 from fetched issues
      rankedIssuesList = repoData.issues.slice(0, 3).map((i) => ({
        number: i.number,
        title: i.title,
        url: i.htmlUrl,
        fitScore: 0.9,
        whyThisOne: 'Clear scope with low contention; well-suited for a newcomer.',
      }));
    }

    if (rankedIssuesList.length === 0) {
      rankedIssuesList = repoData.issues.slice(0, 3).map((i) => ({
        number: i.number,
        title: i.title,
        url: i.htmlUrl,
        fitScore: 0.88,
        whyThisOne: 'Active unassigned issue with actionable scope.',
      }));
    }

    // ── Stage 3: Plan for each issue ──
    onProgress?.('planning', 'Synthesizing PR plans & verified file targets…');
    const fullIssues: RankedIssue[] = [];
    const treePaths = new Set(repoData.tree.map((f) => f.path));

    for (const rankedIssue of rankedIssuesList.slice(0, 3)) {
      onProgress?.('planning', `Planning issue #${rankedIssue.number}: ${rankedIssue.title}…`);
      try {
        const planRaw = await chatCompletion(
          config,
          [
            { role: 'system', content: 'You are an expert coding mentor. Return ONLY valid JSON.' },
            { role: 'user', content: buildPlanPrompt(repoData, summary, { number: rankedIssue.number, title: rankedIssue.title, whyThisOne: rankedIssue.whyThisOne || '' }, level) },
          ],
        );
        const plan = parseJSON<{
          plainExplanation: string;
          blastRadius?: 'Low / Isolated' | 'Moderate' | 'Core Architecture';
          estimatedDiffLines?: string;
          filesToTouch: Array<{ path: string; reason: string; verified: boolean }>;
          plan: string[];
          effort: string;
          risks: string[];
        }>(planRaw);

        // Verify file paths against actual repository tree
        const filesToTouch = (plan.filesToTouch || []).map((f) => ({
          ...f,
          verified: treePaths.has(f.path),
        }));

        // If no verified files were found, find real files from tree
        if (!filesToTouch.some((f) => f.verified)) {
          const matchingPath = [...treePaths].find((p) => p.includes('src/') || p.includes('docs/') || p.includes('test'));
          if (matchingPath) {
            filesToTouch.push({
              path: matchingPath,
              reason: 'Relevant source directory in repository tree',
              verified: true,
            });
          }
        }

        fullIssues.push({
          number: rankedIssue.number,
          title: rankedIssue.title,
          url: rankedIssue.url || `https://github.com/${repoData.meta.fullName}/issues/${rankedIssue.number}`,
          fitScore: rankedIssue.fitScore || 0.88,
          whyThisOne: rankedIssue.whyThisOne || 'Localized scope suitable for contributor level.',
          plainExplanation: plan.plainExplanation || rankedIssue.title,
          blastRadius: plan.blastRadius || 'Low / Isolated',
          estimatedDiffLines: plan.estimatedDiffLines || '15-30 lines',
          filesToTouch,
          plan: plan.plan && plan.plan.length > 0 ? plan.plan : [
            `Fork https://github.com/${repoData.meta.fullName} and clone locally`,
            `Create branch: git checkout -b fix/issue-${rankedIssue.number}`,
            `Implement changes in target files`,
            `Run test suite to verify no regressions`,
            `Commit and open Pull Request referencing #${rankedIssue.number}`,
          ],
          effort: plan.effort || '30-60 minutes',
          risks: plan.risks || ['Verify all unit tests pass before opening PR'],
        });
      } catch {
        // If planning fails for this issue, generate heuristic plan
        const heuristicResult = analyzeRepoHeuristic(repoData, level);
        const match = heuristicResult.issues.find((i) => i.number === rankedIssue.number) || heuristicResult.issues[0];
        if (match) fullIssues.push(match);
      }
    }

    return {
      repo: summary,
      issues: fullIssues.length > 0 ? fullIssues : analyzeRepoHeuristic(repoData, level).issues,
      latencyMs: Math.round(performance.now() - startTime),
      modelUsed: config.model,
    };
  } catch {
    // If entire LLM pipeline encounters error, fallback gracefully to Deep Static Analyzer
    const heuristic = analyzeRepoHeuristic(repoData, level);
    return {
      ...heuristic,
      modelUsed: `${config.model} (Static Intelligence Fallback)`,
    };
  }
}

/**
 * Compare two models side-by-side on the same repository.
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
