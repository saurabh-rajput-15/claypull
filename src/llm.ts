import type { LLMConfig } from './types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Resolves the base URL for Ollama, using the Vite proxy in local dev/preview to avoid CORS for localhost.
 */
function resolveOllamaBase(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, '');
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // When running locally, proxy through Vite /ollama to avoid browser CORS for localhost:11434
  if (
    isLocalHost &&
    (base === 'http://localhost:11434' || base === 'http://127.0.0.1:11434')
  ) {
    return '/ollama';
  }
  return base;
}

/**
 * Generate mock analysis responses for demo or offline testing.
 */
function getMockCompletion(messages: ChatMessage[]): string {
  const userMsg = messages.find((m) => m.role === 'user')?.content || '';

  if (userMsg.includes('produce a JSON summary')) {
    // Stage 1: Summarize + Deep Intelligence
    return JSON.stringify({
      purpose: 'An open-source library and toolchain designed to make building high-performance modern applications straightforward and enjoyable.',
      stack: ['TypeScript', 'React', 'Node.js', 'Vite'],
      setupSteps: [
        'Clone the repository and install dependencies with `npm install`',
        'Copy `.env.example` to `.env` if required',
        'Run test suite with `npm test`',
        'Start development server with `npm run dev`'
      ],
      contributionRules: [
        'Read CONTRIBUTING.md before opening a PR',
        'Ensure all unit tests pass and add tests for new code',
        'Follow existing code conventions and formatting guidelines',
        'Link relevant issue numbers in PR description'
      ],
      intelligence: {
        frictionScore: 2,
        frictionLabel: 'Effortless',
        maintainerVelocity: 'High · PRs reviewed within ~48 hours',
        testFramework: 'Vitest + Playwright',
        setupComplexity: 'One-Command',
        hotspotDirectories: ['src/core', 'packages/utils'],
        welcomeScore: 94
      }
    });
  }

  if (userMsg.includes('Select the TOP 3 issues')) {
    // Stage 2: Rank
    return JSON.stringify({
      issues: [
        {
          number: 1042,
          title: 'Docs: Fix typo and clarify configuration options in getting started guide',
          url: 'https://github.com/example/repo/issues/1042',
          fitScore: 0.96,
          whyThisOne: 'Clear scope, zero risk of breaking production code, and directly helps new users onboard.'
        },
        {
          number: 1088,
          title: 'Add input validation and descriptive error message for missing options parameter',
          url: 'https://github.com/example/repo/issues/1088',
          fitScore: 0.88,
          whyThisOne: 'Isolated bug fix with existing test suite coverage; perfect for practicing unit tests.'
        },
        {
          number: 1115,
          title: 'Export missing utility type helper in index definitions',
          url: 'https://github.com/example/repo/issues/1115',
          fitScore: 0.82,
          whyThisOne: 'Straightforward TypeScript type export fix that touches just two files.'
        }
      ]
    });
  }

  // Stage 3: Plan
  return JSON.stringify({
    plainExplanation: 'This issue asks for better error boundaries and parameter checks when users pass incomplete arguments. It ensures developers get an actionable error message rather than a generic crash.',
    blastRadius: 'Low / Isolated',
    estimatedDiffLines: '15-25 lines',
    filesToTouch: [
      { path: 'src/config.ts', reason: 'Contains argument validation logic where check should be added', verified: true },
      { path: 'test/config.test.ts', reason: 'Add unit tests asserting the descriptive error is thrown', verified: true }
    ],
    plan: [
      'Fork the repository on GitHub and clone to your local machine',
      'Create a branch: git checkout -b fix/issue-parameter-validation',
      'Locate argument parsing function in src/config.ts and add null check',
      'Run npm test to verify existing tests still pass',
      'Add a new test in test/config.test.ts verifying the error message',
      'Commit with conventional commit: git commit -m "fix(config): add descriptive error for missing options"',
      'Push branch and submit Pull Request referencing the issue'
    ],
    effort: '30-45 minutes',
    risks: ['Make sure not to break backwards compatibility with optional configurations']
  });
}

/**
 * Calls an OpenAI-compatible or Ollama chat completions endpoint.
 * Works seamlessly across:
 *   - Local Ollama on dev/preview (http://localhost:11434 via Vite /ollama proxy)
 *   - Deployed link (https://claypull.vercel.app/ via /api/ollama serverless proxy or HTTPS tunnels)
 *   - Ollama Cloud / Remote Ollama instances
 *   - Cloud APIs (Groq, OpenRouter, OpenAI, DeepSeek)
 *   - Instant Mock Demo mode (offline testing)
 */
export async function chatCompletion(
  config: LLMConfig,
  messages: ChatMessage[],
  jsonMode = true,
): Promise<string> {
  // If mock mode is selected, return simulated response with brief realistic latency
  if (config.provider === 'mock-demo') {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return getMockCompletion(messages);
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const cleanEndpoint = config.endpoint.replace(/\/+$/, '');
  const isLocalhostEndpoint = cleanEndpoint.startsWith('http://localhost') || cleanEndpoint.startsWith('http://127.0.0.1');

  // If deployed on HTTPS (e.g. https://claypull.vercel.app/) and calling a remote URL (not localhost),
  // route through the /api/ollama serverless proxy to eliminate browser CORS restrictions completely
  const useServerlessProxy = isHttps && !isLocalhostEndpoint;

  if (useServerlessProxy) {
    try {
      const res = await fetch('/api/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: config.endpoint,
          model: config.model,
          messages,
          jsonMode,
          apiKey: config.apiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? (typeof data === 'string' ? data : '');
      }
      // If serverless proxy returned an error, capture it or fall through to direct fetch
      const errJson = await res.json().catch(() => ({}));
      if (errJson.error || errJson.details) {
        throw new Error(errJson.error || errJson.details);
      }
    } catch (proxyErr: unknown) {
      if (proxyErr instanceof Error && !proxyErr.message.includes('Failed to fetch')) {
        throw proxyErr;
      }
      // Otherwise attempt direct fetch below
    }
  }

  let url: string;

  if (config.provider === 'ollama-local') {
    const base = resolveOllamaBase(config.endpoint);
    url = `${base}/v1/chat/completions`;
  } else if (config.provider === 'ollama-cloud') {
    url = cleanEndpoint.endsWith('/v1') ? `${cleanEndpoint}/chat/completions` : `${cleanEndpoint}/v1/chat/completions`;
  } else {
    // custom-endpoint
    url = cleanEndpoint.endsWith('/chat/completions') ? cleanEndpoint : `${cleanEndpoint}/chat/completions`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.2,
    max_tokens: 4096,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`LLM API error (${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        if (config.provider === 'ollama-local') {
          if (isHttps) {
            throw new Error(
              `Could not connect to local Ollama from https://claypull.vercel.app (blocked by browser HTTPS-to-HTTP mixed content). To use local Ollama with the deployed link: 1) Run 'npm run tunnel' or 'npx localtunnel --port 11434' and paste the https:// URL into Endpoint, or 2) Run locally at http://localhost:5174, or 3) Switch to Instant Demo or Cloud API.`,
              { cause: err },
            );
          }
          throw new Error(
            `Could not connect to local Ollama at ${config.endpoint}. Please make sure Ollama is running ('ollama serve') or switch to Demo Mode.`,
            { cause: err },
          );
        }
        throw new Error(
          `Could not connect to model endpoint at ${url}. Check your network, URL, and CORS settings.`,
          { cause: err },
        );
      }
      throw err;
    }
    throw new Error('Unknown error during LLM request.', { cause: err });
  }
}

/**
 * Fetch list of models from an Ollama instance.
 */
export async function listOllamaModels(endpoint: string): Promise<string[]> {
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isLocalhostEndpoint = cleanEndpoint.startsWith('http://localhost') || cleanEndpoint.startsWith('http://127.0.0.1');

  // If deployed on HTTPS and endpoint is remote, fetch tags via /api/ollama?endpoint=...
  if (isHttps && !isLocalhostEndpoint) {
    try {
      const res = await fetch(`/api/ollama?endpoint=${encodeURIComponent(endpoint)}`);
      if (res.ok) {
        const data = await res.json();
        return (data.models || []).map((m: { name: string }) => m.name);
      }
    } catch {
      // Fall through to direct fetch
    }
  }

  try {
    const base = resolveOllamaBase(endpoint);
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
