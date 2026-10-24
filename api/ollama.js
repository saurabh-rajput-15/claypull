/**
 * Vercel Serverless Function — Ollama & Cloud LLM Proxy
 * Routes AI inference and model discovery for deployed environments (e.g. https://claypull.vercel.app/)
 * Eliminates browser CORS and mixed-content issues for remote Ollama, tunnels, and cloud APIs.
 */

export default async function handler(req, res) {
  // Enable CORS for all incoming requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ── GET: Model discovery (/api/tags) ──
    if (req.method === 'GET') {
      const endpoint = req.query.endpoint || 'http://localhost:11434';
      const cleanBase = endpoint.replace(/\/+$/, '');
      const tagsUrl = `${cleanBase}/api/tags`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const targetRes = await fetch(tagsUrl, {
        signal: controller.signal,
        headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
      }).finally(() => clearTimeout(timeoutId));

      if (!targetRes.ok) {
        return res.status(targetRes.status).json({ error: `Ollama tags returned status ${targetRes.status}` });
      }

      const data = await targetRes.json();
      return res.status(200).json(data);
    }

    // ── POST: Chat completions (/v1/chat/completions) ──
    if (req.method === 'POST') {
      const { endpoint, model, messages, jsonMode, apiKey, path } = req.body || {};

      if (!endpoint && !path) {
        return res.status(400).json({ error: 'Missing endpoint or path parameter.' });
      }

      let targetUrl = '';
      if (path) {
        targetUrl = path;
      } else {
        const cleanBase = (endpoint || 'http://localhost:11434').replace(/\/+$/, '');
        targetUrl = cleanBase.endsWith('/v1') 
          ? `${cleanBase}/chat/completions` 
          : `${cleanBase}/v1/chat/completions`;
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      if (apiKey || req.headers.authorization) {
        headers['Authorization'] = apiKey ? `Bearer ${apiKey}` : req.headers.authorization;
      }

      const bodyPayload = {
        model,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
      };

      if (jsonMode) {
        bodyPayload.response_format = { type: 'json_object' };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s for LLM generation

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const text = await response.text();

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Target returned HTTP ${response.status}`,
          details: text,
        });
      }

      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch {
        return res.status(200).send(text);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    return res.status(502).json({
      error: isAbort ? 'Connection timed out reaching Ollama endpoint' : 'Failed to reach Ollama endpoint',
      message: err.message,
    });
  }
}
