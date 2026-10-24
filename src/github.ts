import type { FetchedRepoData, GitHubIssue, RepoFile, RepoMeta } from './types';

const GITHUB_API = 'https://api.github.com';

/**
 * Robust GitHub repository parser.
 * Handles:
 *   - "owner/repo"
 *   - "https://github.com/owner/repo"
 *   - "https://github.com/owner/repo/issues"
 *   - "https://github.com/owner/repo/tree/main"
 *   - "git@github.com:owner/repo.git"
 */
export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/, '');
  const match = trimmed.match(/(?:github\.com[/:]|^)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (!match) {
    throw new Error('Invalid repository format. Please provide "owner/repo" or a valid GitHub URL.');
  }
  return { owner: match[1], repo: match[2].replace(/\/.*$/, '') };
}

/**
 * Sanitize user-provided or environment GitHub token.
 * Strips accidental wrapping quotes ("token" or 'token'), leading 'Bearer ', and whitespace.
 */
export function sanitizeGitHubToken(token?: string): string {
  if (!token) return '';
  return token
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

/**
 * Session-level token blacklist.
 * Once a token gets a 401, we remember it for the rest of the page session
 * so we stop wasting API calls retrying the same dead token.
 */
const invalidatedTokens = new Set<string>();

function effectiveToken(token?: string): string {
  const clean = sanitizeGitHubToken(token);
  if (clean && invalidatedTokens.has(clean)) return '';
  return clean;
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  const t = effectiveToken(token);
  if (t) {
    h.Authorization = `Bearer ${t}`;
  }
  return h;
}

async function fetchJSON<T>(url: string, token?: string): Promise<T> {
  const t = effectiveToken(token);
  let res = await fetch(url, { headers: headers(t) });

  // Resilient 401 fallback: if user provided an invalid/expired token, retry unauthenticated
  // and blacklist the token for the rest of the session
  if (res.status === 401 && t) {
    invalidatedTokens.add(t);
    console.warn(
      `[ClayPull] GitHub token invalidated (401). All subsequent requests will use unauthenticated public access.`,
    );
    res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        'GitHub authentication failed (401 Unauthorized). The provided GitHub token is expired or invalid. Please update or clear your token in Settings to use public access.',
      );
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error(
        'GitHub API rate limit exceeded (60 requests/hr for unauthenticated users). Add a valid GitHub Personal Access Token in Settings to increase limit to 5,000/hr.',
      );
    }
    if (res.status === 404) {
      throw new Error('Repository not found. Check the URL or provide a valid GitHub token if the repository is private.');
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Extract embedded image / screenshot URLs from issue body markdown.
 */
function extractImageUrls(body: string): string[] {
  if (!body) return [];
  const urls: string[] = [];
  const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/g;

  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(body)) !== null) {
    if (match[1] && !urls.includes(match[1])) urls.push(match[1]);
  }
  while ((match = htmlRegex.exec(body)) !== null) {
    if (match[1] && !urls.includes(match[1])) urls.push(match[1]);
  }
  return urls;
}

/**
 * Decode base64 content if returned by GitHub contents API.
 */
function decodeBase64(content: string): string {
  try {
    const clean = content.replace(/\s/g, '');
    if (typeof window !== 'undefined' && window.atob) {
      return decodeURIComponent(escape(window.atob(clean)));
    }
    const globalBuf = (globalThis as unknown as { Buffer?: { from: (c: string, e: string) => { toString: (e: string) => string } } }).Buffer;
    if (globalBuf) {
      return globalBuf.from(clean, 'base64').toString('utf8');
    }
  } catch {
    // fallback
  }
  return content;
}

async function fetchText(url: string, token?: string): Promise<string> {
  try {
    const t = effectiveToken(token);
    let res = await fetch(url, {
      headers: { ...headers(t), Accept: 'application/vnd.github.raw+json' },
    });
    if (res.status === 401 && t) {
      invalidatedTokens.add(t);
      res = await fetch(url, {
        headers: { Accept: 'application/vnd.github.raw+json' },
      });
    }
    if (!res.ok) return '';
    const text = await res.text();

    // In case GitHub returns JSON with { content: base64 }
    if (text.startsWith('{') && text.includes('"content"')) {
      try {
        const json = JSON.parse(text);
        if (json.content && json.encoding === 'base64') {
          return decodeBase64(json.content);
        }
      } catch {
        // use raw text
      }
    }
    return text;
  } catch {
    return '';
  }
}

export async function fetchRepoData(
  input: string,
  token?: string,
  onProgress?: (msg: string) => void,
): Promise<FetchedRepoData> {
  const { owner, repo } = parseRepoUrl(input);
  const base = `${GITHUB_API}/repos/${owner}/${repo}`;

  onProgress?.('Fetching repository metadata…');
  const raw = await fetchJSON<Record<string, unknown>>(base, token);
  const meta: RepoMeta = {
    fullName: raw.full_name as string,
    description: (raw.description as string) || '',
    language: (raw.language as string) || 'Unknown',
    stars: (raw.stargazers_count as number) || 0,
    forks: (raw.forks_count as number) || 0,
    openIssues: (raw.open_issues_count as number) || 0,
    topics: (raw.topics as string[]) || [],
    defaultBranch: (raw.default_branch as string) || 'main',
    htmlUrl: (raw.html_url as string) || `https://github.com/${owner}/${repo}`,
  };

  onProgress?.('Fetching README & CONTRIBUTING guides…');

  // Multi-path lookup for CONTRIBUTING
  const fetchContributing = async (): Promise<string> => {
    const paths = [
      `${base}/contents/CONTRIBUTING.md`,
      `${base}/contents/.github/CONTRIBUTING.md`,
      `${base}/contents/docs/CONTRIBUTING.md`,
      `${base}/contents/contributing.md`,
      `${base}/contents/CONTRIBUTING.rst`,
      `${base}/contents/CONTRIBUTING`,
    ];
    for (const p of paths) {
      const text = await fetchText(p, token);
      if (text && text.trim().length > 30) return text;
    }
    return '';
  };

  const [readme, contributing] = await Promise.all([
    fetchText(`${base}/readme`, token),
    fetchContributing(),
  ]);

  onProgress?.('Ingesting directory tree & file architecture…');
  let tree: RepoFile[] = [];
  try {
    const treeData = await fetchJSON<{ tree: Array<{ path: string; type: string }> }>(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${meta.defaultBranch}?recursive=1`,
      token,
    );
    tree = treeData.tree
      .filter((t) => t.path.split('/').length <= 5) // depth limit
      .slice(0, 300) // size limit
      .map((t) => ({ path: t.path, type: t.type === 'tree' ? 'dir' : 'file' }));
  } catch {
    // Fallback: use root contents API
    try {
      const contents = await fetchJSON<Array<{ name: string; type: string }>>(
        `${base}/contents`,
        token,
      );
      tree = contents.map((c) => ({ path: c.name, type: c.type === 'dir' ? 'dir' : 'file' }));
    } catch {
      // tree remains empty
    }
  }

  onProgress?.('Triaging open repository issues…');
  const allIssues: GitHubIssue[] = [];
  const seenNumbers = new Set<number>();

  // Efficient batch fetching: 50 open issues in 1 single API request!
  try {
    const rawIssues = await fetchJSON<Array<Record<string, unknown>>>(
      `${base}/issues?state=open&per_page=50&sort=updated&direction=desc`,
      token,
    );

    const beginnerBucket: GitHubIssue[] = [];
    const docsBucket: GitHubIssue[] = [];
    const standardBucket: GitHubIssue[] = [];

    const BEGINNER_REGEX = /good.?first|beginner|starter|easy|first.timer|help.?wanted|up.?for.?grabs|hacktoberfest|low.?hanging|good.?first.?pr/i;
    const DOCS_REGEX = /doc|typo|readme|guide|tutorial|example|chore|minor/i;

    for (const issue of rawIssues) {
      const num = issue.number as number;
      if (seenNumbers.has(num)) continue;
      seenNumbers.add(num);

      // Skip Pull Requests (GitHub REST API bundles PRs in /issues)
      if (issue.pull_request) continue;

      // Skip already assigned issues
      if (issue.assignee) continue;

      // Skip stale issues (> 24 months without update)
      const updated = new Date(issue.updated_at as string);
      const monthsAgo = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > 24) continue;

      const labels = ((issue.labels as Array<{ name: string }>) || []).map((l) => l.name);
      const labelsStr = labels.join(' ');
      const title = (issue.title as string) || '';

      const rawBody = (issue.body as string) || '';
      const gitHubIssue: GitHubIssue = {
        number: num,
        title,
        body: rawBody.slice(0, 3000),
        labels,
        commentCount: (issue.comments as number) || 0,
        assignee: null,
        updatedAt: (issue.updated_at as string) || new Date().toISOString(),
        htmlUrl: (issue.html_url as string) || `https://github.com/${owner}/${repo}/issues/${num}`,
        hasPR: false,
        images: extractImageUrls(rawBody),
      };

      if (BEGINNER_REGEX.test(labelsStr)) {
        beginnerBucket.push(gitHubIssue);
      } else if (DOCS_REGEX.test(labelsStr) || DOCS_REGEX.test(title)) {
        docsBucket.push(gitHubIssue);
      } else {
        standardBucket.push(gitHubIssue);
      }
    }

    // Sort buckets: fewer comments first (less debate, fresher issue)
    beginnerBucket.sort((a, b) => a.commentCount - b.commentCount);
    docsBucket.sort((a, b) => a.commentCount - b.commentCount);
    standardBucket.sort((a, b) => a.commentCount - b.commentCount);

    // Merge prioritized candidate issues
    allIssues.push(...beginnerBucket, ...docsBucket, ...standardBucket);
  } catch {
    // issue fetch error
  }

  // Tier 2: If we found 0 beginner issues and repo has lots of open issues, check specific "good-first-issue" label
  if (allIssues.length === 0 && meta.openIssues > 0) {
    const fallbackLabels = ['good-first-issue', 'good first issue', 'help-wanted'];
    for (const label of fallbackLabels) {
      try {
        const rawFallback = await fetchJSON<Array<Record<string, unknown>>>(
          `${base}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=10&sort=updated&direction=desc`,
          token,
        );
        for (const issue of rawFallback) {
          const num = issue.number as number;
          if (seenNumbers.has(num)) continue;
          seenNumbers.add(num);
          if (issue.pull_request || issue.assignee) continue;

          const rawFallbackBody = (issue.body as string) || '';
          allIssues.push({
            number: num,
            title: issue.title as string,
            body: rawFallbackBody.slice(0, 3000),
            labels: ((issue.labels as Array<{ name: string }>) || []).map((l) => l.name),
            commentCount: (issue.comments as number) || 0,
            assignee: null,
            updatedAt: issue.updated_at as string,
            htmlUrl: issue.html_url as string,
            hasPR: false,
            images: extractImageUrls(rawFallbackBody),
          });
        }
      } catch {
        // label search may not match
      }
      if (allIssues.length >= 10) break;
    }
  }

  return {
    meta,
    readme: readme.slice(0, 10000),
    contributing: contributing.slice(0, 5000),
    tree,
    issues: allIssues.slice(0, 25),
  };
}
