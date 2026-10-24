import type { FetchedRepoData, GitHubIssue, RepoFile, RepoMeta } from './types';

const GITHUB_API = 'https://api.github.com';

function parseRepoUrl(input: string): { owner: string; repo: string } {
  // Accept "owner/repo" or full GitHub URL
  const match = input.match(/(?:github\.com\/)?([^/\s]+)\/([^/\s#?]+)/);
  if (!match) throw new Error('Invalid repo format. Use "owner/repo" or a GitHub URL.');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function fetchJSON<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) {
    if (res.status === 403) throw new Error('GitHub API rate limit exceeded. Provide a token or wait.');
    if (res.status === 404) throw new Error('Repository not found.');
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchText(url: string, token?: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { ...headers(token), Accept: 'application/vnd.github.raw+json' },
    });
    if (!res.ok) return '';
    return res.text();
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
    stars: raw.stargazers_count as number,
    forks: raw.forks_count as number,
    openIssues: raw.open_issues_count as number,
    topics: (raw.topics as string[]) || [],
    defaultBranch: raw.default_branch as string,
    htmlUrl: raw.html_url as string,
  };

  onProgress?.('Fetching README & CONTRIBUTING…');
  const [readme, contributing] = await Promise.all([
    fetchText(`${base}/readme`, token),
    fetchText(`${base}/contents/CONTRIBUTING.md`, token),
  ]);

  onProgress?.('Fetching directory tree…');
  let tree: RepoFile[] = [];
  try {
    const treeData = await fetchJSON<{ tree: Array<{ path: string; type: string }> }>(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${meta.defaultBranch}?recursive=1`,
      token,
    );
    tree = treeData.tree
      .filter((t) => t.path.split('/').length <= 4) // depth limit
      .slice(0, 200) // size limit
      .map((t) => ({ path: t.path, type: t.type === 'tree' ? 'dir' : 'file' }));
  } catch {
    // Fallback: use contents API
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

  onProgress?.('Fetching issues…');
  const labelQueries = ['good first issue', 'help wanted', 'beginner', 'easy', 'first-timers-only'];
  const allIssues: GitHubIssue[] = [];
  const seenNumbers = new Set<number>();

  for (const label of labelQueries) {
    try {
      const rawIssues = await fetchJSON<Array<Record<string, unknown>>>(
        `${base}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=10&sort=updated&direction=desc`,
        token,
      );
      for (const issue of rawIssues) {
        const num = issue.number as number;
        if (seenNumbers.has(num)) continue;
        seenNumbers.add(num);

        // Filter: skip assigned, skip with linked PRs
        if (issue.assignee) continue;
        if (issue.pull_request) continue;

        // Filter: skip stale (>12 months)
        const updated = new Date(issue.updated_at as string);
        const monthsAgo = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo > 12) continue;

        allIssues.push({
          number: num,
          title: issue.title as string,
          body: ((issue.body as string) || '').slice(0, 2000),
          labels: ((issue.labels as Array<{ name: string }>) || []).map((l) => l.name),
          commentCount: issue.comments as number,
          assignee: null,
          updatedAt: issue.updated_at as string,
          htmlUrl: issue.html_url as string,
          hasPR: false,
        });
      }
    } catch {
      // label may not exist
    }
    if (allIssues.length >= 20) break;
  }

  return {
    meta,
    readme: readme.slice(0, 8000), // truncate large readmes
    contributing: contributing.slice(0, 4000),
    tree,
    issues: allIssues.slice(0, 20),
  };
}
