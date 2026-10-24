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
 * Calls an OpenAI-compatible or Ollama chat completions endpoint.
 * Works across:
 *   - Local Ollama on dev/preview (http://localhost:11434 via Vite /ollama proxy)
 *   - Deployed link (https://claypull.vercel.app/ via /api/ollama serverless proxy or HTTPS tunnels)
 *   - Ollama Cloud / Remote Ollama instances
 *   - Cloud APIs (Groq, OpenRouter, OpenAI, DeepSeek, Google Gemini)
 *   - Instant Deep Static Intelligence Engine
 */
export async function chatCompletion(
  config: LLMConfig,
  messages: ChatMessage[],
  jsonMode = true,
): Promise<string> {
  // If instant deep heuristic is selected, we don't need external LLM
  if (config.provider === 'mock-demo' || config.provider === 'deep-heuristic') {
    return '{}';
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const cleanEndpoint = config.endpoint.replace(/\/+$/, '');
  const isLocalhostEndpoint = cleanEndpoint.startsWith('http://localhost') || cleanEndpoint.startsWith('http://127.0.0.1');

  // If deployed on HTTPS and calling a remote URL (not localhost),
  // route through the /api/ollama serverless proxy to eliminate browser CORS restrictions
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
    // custom-endpoint / cloud API (Groq, OpenRouter, OpenAI, etc.)
    url = cleanEndpoint.endsWith('/chat/completions') ? cleanEndpoint : `${cleanEndpoint}/chat/completions`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
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
              `Could not connect to local Ollama from deployed HTTPS. Run 'npm run tunnel' or switch to Deep Heuristic Engine / Cloud API.`,
              { cause: err },
            );
          }
          throw new Error(
            `Could not connect to local Ollama at ${config.endpoint}. Please make sure Ollama is running ('ollama serve') or switch to Deep Heuristic Engine.`,
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
