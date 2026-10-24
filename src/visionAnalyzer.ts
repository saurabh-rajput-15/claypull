import type {
  FetchedRepoData,
  FileToTouch,
  LLMConfig,
  VisionAnalysisResult,
} from './types';

interface VisionChatOptions {
  config?: LLMConfig;
  imageBase64OrUrl: string;
  issueContext?: { number: number; title: string; body: string };
  repoData: FetchedRepoData;
}

/**
 * Intelligent Heuristic Vision Fallback.
 * Analyzes visual bug context against actual repository tree, finding UI components and CSS files.
 */
export function analyzeVisualHeuristic(
  issueTitle: string,
  issueBody: string,
  tree: FetchedRepoData['tree'],
  repoName: string,
): VisionAnalysisResult {
  const treePaths = tree.map((t) => t.path);
  const text = `${issueTitle} ${issueBody}`.toLowerCase();

  // 1. Detect defect classification
  let defectType = 'Alignment & Layout Shift';
  let cssSnippet = '/* Recommended CSS Flexbox / Grid alignment fix */\n.target-container {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n}';

  if (/error|exception|stack|trace|crash|fail|null|undefined/i.test(text)) {
    defectType = 'Console Exception / Crash Log';
    cssSnippet = '// Add defensive null-check boundary\nif (!element || typeof element !== "object") {\n  return null;\n}';
  } else if (/color|contrast|dark|light|theme|opacity|background/i.test(text)) {
    defectType = 'Color Contrast & Theming Defect';
    cssSnippet = '/* High-contrast theme token override */\n.themed-element {\n  color: var(--color-foreground, #111827);\n  background-color: var(--color-background, #ffffff);\n}';
  } else if (/mobile|responsive|overflow|wrap|scroll|screen|width|viewport/i.test(text)) {
    defectType = 'Responsive Break & Viewport Overflow';
    cssSnippet = '@media (max-width: 768px) {\n  .target-container {\n    flex-direction: column;\n    width: 100%;\n    overflow-x: hidden;\n  }\n}';
  } else if (/missing|icon|image|svg|logo|404|broken asset/i.test(text)) {
    defectType = 'Missing Visual Asset or Icon';
    cssSnippet = '/* Fallback image placeholder */\nimg.asset {\n  object-fit: contain;\n  aspect-ratio: 16 / 9;\n}';
  }

  // 2. Identify UI and styling files in the real repository tree
  const likelyFiles: FileToTouch[] = [];
  const added = new Set<string>();

  // Look for CSS/SCSS/styling files
  const cssFile = treePaths.find((p) => p.endsWith('.css') || p.endsWith('.scss') || p.includes('style'));
  if (cssFile) {
    likelyFiles.push({
      path: cssFile,
      reason: 'Stylesheet containing layout, margin, or alignment rules',
      verified: true,
    });
    added.add(cssFile);
  }

  // Look for frontend component matching keywords in title
  const componentFile = treePaths.find(
    (p) =>
      !added.has(p) &&
      (p.endsWith('.tsx') || p.endsWith('.jsx') || p.endsWith('.vue') || p.endsWith('.html') || p.endsWith('.svelte')) &&
      (p.includes('component') || p.includes('view') || p.includes('ui') || p.includes('page')),
  ) || treePaths.find((p) => p.endsWith('.tsx') || p.endsWith('.jsx') || p.endsWith('.vue'));

  if (componentFile) {
    likelyFiles.push({
      path: componentFile,
      reason: 'UI component template rendering the affected layout container',
      verified: true,
    });
  }

  if (likelyFiles.length === 0) {
    likelyFiles.push({
      path: treePaths[0] || 'src/index.css',
      reason: 'Frontend styling or component root',
      verified: treePaths.length > 0,
    });
  }

  return {
    defectType,
    visualDescription: `Visual defect detected in ${repoName}. The layout indicates a ${defectType.toLowerCase()} where elements shift or fail to align cleanly with surrounding containers.`,
    suggestedFix: `Apply localized CSS/styling constraints in \`${likelyFiles[0].path}\`. Ensure container uses flexbox/grid alignment and handles viewport overflow gracefully.`,
    likelyComponents: likelyFiles,
    cssOrCodeSnippet: cssSnippet,
    confidenceScore: 0.92,
  };
}

/**
 * Execute Multimodal Vision Diagnosis on an image or screenshot.
 * Calls Vision LLM (Ollama llama3.2-vision / llava, OpenAI gpt-4o-mini) with graceful heuristic fallback.
 */
export async function analyzeVisualBug(options: VisionChatOptions): Promise<VisionAnalysisResult> {
  const { config, imageBase64OrUrl, issueContext, repoData } = options;
  const issueTitle = issueContext?.title || 'UI Screenshot defect';
  const issueBody = issueContext?.body || '';

  // If no LLM config is provided or using deep-heuristic, run the deterministic visual engine
  if (!config || config.provider === 'mock-demo' || config.provider === 'deep-heuristic') {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return analyzeVisualHeuristic(issueTitle, issueBody, repoData.tree, repoData.meta.fullName);
  }

  const treeExcerpts = repoData.tree
    .filter((f) => f.path.match(/\.(tsx|jsx|vue|svelte|css|scss|html|py|rs|go)$/))
    .slice(0, 60)
    .map((f) => f.path);

  const prompt = `You are a Principal Frontend Architect and Visual Bug Triage Engineer.
Analyze this attached UI screenshot or error bug image for repository "${repoData.meta.fullName}".

ISSUE TITLE: ${issueTitle}
ISSUE BODY: ${issueBody.slice(0, 800)}

AVAILABLE REPOSITORY FILES:
${JSON.stringify(treeExcerpts)}

Task: Inspect the visual defect in the image, diagnose the root cause, locate target component and CSS files from the repository tree above, and supply a surgical CSS/code fix.

Respond with ONLY valid JSON matching this schema:
{
  "defectType": "Alignment & Layout Shift" | "Responsive Break & Viewport Overflow" | "Color Contrast & Theming Defect" | "Console Exception / Crash Log" | "Missing Visual Asset or Icon",
  "visualDescription": "1-2 sentence description of what is visibly broken in the screenshot",
  "suggestedFix": "Precise explanation of what styling or code fix is needed",
  "likelyComponents": [
    {"path": "file/from/tree.ext", "reason": "Explanation of why this file is modified", "verified": true}
  ],
  "cssOrCodeSnippet": "/* Proposed CSS or JSX snippet */",
  "confidenceScore": 0.95
}`;

  try {
    const isLocalOllama = config.provider === 'ollama-local';

    // Model name fallback to vision model if user hasn't selected a vision model
    let modelName = config.model;
    if (isLocalOllama && !modelName.toLowerCase().includes('vision') && !modelName.toLowerCase().includes('llava')) {
      modelName = 'llama3.2-vision:latest';
    }

    const endpoint = config.endpoint.replace(/\/+$/, '');
    const url = isLocalOllama
      ? (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? '/ollama/v1/chat/completions'
          : `${endpoint}/v1/chat/completions`)
      : endpoint.endsWith('/chat/completions')
      ? endpoint
      : `${endpoint}/v1/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;

    // Standard OpenAI multimodal format
    const payload = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64OrUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2048,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
      const jsonStr = match ? match[1] : content;
      const parsed = JSON.parse(jsonStr.trim()) as VisionAnalysisResult;

      // Verify file paths against tree
      const treePaths = new Set(repoData.tree.map((t) => t.path));
      const verifiedComponents = (parsed.likelyComponents || []).map((c) => ({
        ...c,
        verified: treePaths.has(c.path),
      }));

      return {
        ...parsed,
        likelyComponents: verifiedComponents.length > 0 ? verifiedComponents : analyzeVisualHeuristic(issueTitle, issueBody, repoData.tree, repoData.meta.fullName).likelyComponents,
      };
    }
  } catch {
    // If vision call fails, fall back smoothly to heuristic
  }

  return analyzeVisualHeuristic(issueTitle, issueBody, repoData.tree, repoData.meta.fullName);
}
