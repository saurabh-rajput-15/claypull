# FirstPR — Product Requirements Document

**Event:** Hacktoberfest Hack Day Dhule × ARIF
**Track:** Best Open-Source AI Project
**Status:** Draft v1 (hack-day scope)
**License:** MIT (or Apache-2.0)

---

## 1. One-line pitch

FirstPR is an open-source contribution coach: paste a GitHub repo URL, pick your skill level, and a locally running open-weight model finds three beginner-friendly issues, explains them in plain language, and gives you a step-by-step plan from fork to pull request.

## 2. Problem

First-time contributors usually get stuck before writing any code:

- Large repos have long READMEs, unclear structure, and scattered contribution rules.
- `good first issue` labels are inconsistent. Many are stale, already claimed, or not actually beginner-friendly.
- Beginners don't know which files to open, how to set up the project, or what a maintainer expects in a PR.
- Existing AI tools need paid API keys or send code to third-party servers.

Result: many people give up during Hacktoberfest without ever opening a PR.

## 3. Target users

| User | Need |
|---|---|
| **First-time contributor** (student, bootcamp learner) | Understand a repo fast and find a doable issue |
| **Returning contributor** | Quickly assess a new repo's setup and conventions |
| **Community organizer / mentor** | Point a group of newcomers to suitable projects |
| **Agent / tool builder** | Reuse the workflow as a `SKILL.md` in their own agent |

## 4. Goals and non-goals

### Goals
1. Go from repo URL to a ranked, explained shortlist of 3 issues in under about 2 minutes on a laptop.
2. Run entirely on an open-weight model via Ollama or llama.cpp, with no paid API key.
3. Work fully offline for already-fetched repo data (offline mode).
4. Ship three interfaces on one core engine: CLI, web UI, and agent skill.
5. Demonstrate quality by comparing two small models on the same repo.

### Non-goals (for the hack day)
- Writing the code fix or opening the PR for the user.
- Supporting GitLab, Bitbucket, or private repos.
- User accounts, databases, or persistent history.
- Guaranteeing issue correctness. FirstPR advises, and the user verifies.

## 5. User stories

1. As a beginner, I paste a repo URL and choose "beginner", so I get issues that match my level.
2. As a contributor, I see why each issue was picked and what it actually asks for, in plain language.
3. As a contributor, I see which files to touch and in what order, so I'm not lost in the codebase.
4. As a contributor, I get the exact fork, clone, branch, commit, and PR steps for that repo, following its CONTRIBUTING rules.
5. As a privacy-conscious user, I can run everything locally with no data leaving my machine.
6. As an agent builder, I can drop `SKILL.md` into my agent and get the same behavior.
7. As a judge, I can clone the repo and run it in a few commands.

## 6. Functional requirements

### 6.1 Input
- **FR-1:** Accept a GitHub repo URL (`https://github.com/owner/repo`) or `owner/repo`.
- **FR-2:** Accept skill level: `beginner` | `intermediate` | `advanced`.
- **FR-3:** Optionally accept preferred language/stack (e.g. "Python", "docs only").
- **FR-4:** Optionally accept a GitHub token to raise API rate limits (never required).

### 6.2 Repo ingestion
- **FR-5:** Fetch via the GitHub REST API: repo metadata, README, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (if present), top-level directory tree (depth-limited), and open issues labeled `good first issue` / `help wanted` / `beginner` (up to ~20).
- **FR-6:** For each candidate issue, fetch the title, body, labels, comment count, assignee, and last-updated date.
- **FR-7:** Filter out issues that are assigned, have a linked open PR, or have been inactive for more than a configurable threshold (default 12 months).
- **FR-8:** Cache fetched data on disk (`.firstpr_cache/`) so reruns and offline mode work.

### 6.3 Analysis pipeline (prompt chain)
- **FR-9 — Stage 1: Repo summary.** Chunk README, CONTRIBUTING, and tree. Produce a compact summary: purpose, stack, how to set up and run tests, contribution rules.
- **FR-10 — Stage 2: Issue ranking.** Score each candidate issue for fit with the user's skill level (clarity, scope, required knowledge, likelihood of being still available). Select the top 3.
- **FR-11 — Stage 3: Per-issue plan.** For each selected issue, generate:
  - A plain-language explanation (what, why, expected outcome)
  - Likely files/directories to touch, with a reason for each
  - A step-by-step plan from fork to PR, referencing the repo's own CONTRIBUTING rules
  - Estimated effort and "things that could go wrong"
- **FR-12:** All stages return structured JSON validated against a schema. On invalid output, retry once with a repair prompt, then fall back to a plain-text rendering.
- **FR-13:** Stage 3 must only reference files that exist in the fetched tree. Unverified file suggestions are marked "guess".

### 6.4 Output
- **FR-14:** Show a repo overview card, the three issue cards, and the fork-to-PR checklist.
- **FR-15:** Export results as Markdown (`firstpr-report.md`).
- **FR-16:** Every issue card links back to the original GitHub issue.

### 6.5 Interfaces
- **CLI:** `firstpr analyze owner/repo --level beginner --model qwen2.5-coder:7b --out report.md`
- **Web UI:** single page with a URL input, skill selector, model selector, a progress indicator per pipeline stage, and result cards.
- **Agent skill:** `SKILL.md` describing when to trigger, the inputs, the pipeline steps, and output format, so any agent can follow it.

### 6.6 Models and offline mode
- **FR-17:** Model backend is pluggable through an OpenAI-compatible endpoint (Ollama default: `http://localhost:11434`).
- **FR-18:** Default model is configurable. Tested candidates are Qwen2.5-Coder (7B), Llama 3.x (8B), and a Gemma variant.
- **FR-19:** `--offline` flag uses only cached repo data and fails clearly if the cache is missing.
- **FR-20:** No telemetry, no external calls apart from the GitHub API (and none in offline mode).

### 6.7 Model comparison (differentiator)
- **FR-21:** `firstpr compare owner/repo --models modelA,modelB` runs the same pipeline with both models and renders results side by side, with latency and a rubric score (see section 10).

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Full analysis in about 2 minutes or less on a laptop with a 7B–8B quantized model |
| Hardware | Runs on 16 GB RAM, with or without a GPU (slower on CPU) |
| Reliability | Graceful handling of GitHub rate limits, empty issue lists, huge READMEs (truncate and chunk) |
| Privacy | Everything local except GitHub API reads; no keys required |
| Setup | Under 5 commands from clone to first run |
| Licensing | OSI-approved license, clear README, `.env.example` only (no secrets committed) |

## 8. System design

### 8.1 Architecture

```
            ┌────────────┐   ┌────────────┐   ┌──────────────┐
            │    CLI     │   │   Web UI   │   │  SKILL.md    │
            └─────┬──────┘   └─────┬──────┘   └──────┬───────┘
                  └───────┬────────┴─────────────────┘
                          ▼
                 ┌─────────────────┐
                 │   Core engine   │
                 │  (Python pkg)   │
                 └───┬─────────┬───┘
                     │         │
          ┌──────────▼───┐  ┌──▼────────────────┐
          │ GitHub client│  │ LLM client        │
          │ + disk cache │  │ (Ollama / llama.cpp│
          └──────────────┘  │  OpenAI-compatible)│
                            └────────────────────┘
```

### 8.2 Pipeline

```
URL + level
   │
   ▼
Fetch repo data ──► cache
   │
   ▼
Stage 1: summarize repo (README + CONTRIBUTING + tree)
   │
   ▼
Stage 2: rank issues → top 3
   │
   ▼
Stage 3: per-issue explanation + files + fork-to-PR plan
   │
   ▼
Validate JSON → render (CLI / Web / Markdown)
```

### 8.3 Suggested tech stack

- **Language:** Python 3.11+
- **Backend/API:** FastAPI
- **CLI:** Typer
- **Frontend:** a single static HTML page (or minimal Next.js if time allows)
- **LLM runtime:** Ollama (default), llama.cpp server as an alternative
- **Validation:** Pydantic models for every stage output
- **HTTP:** httpx
- **Tests:** pytest, with fixtures from cached sample repos

### 8.4 Proposed repo structure

```
firstpr/
├── README.md
├── LICENSE
├── SKILL.md
├── prd.md
├── .env.example
├── pyproject.toml
├── firstpr/
│   ├── cli.py
│   ├── api.py
│   ├── github_client.py
│   ├── cache.py
│   ├── llm.py
│   ├── pipeline/
│   │   ├── summarize.py
│   │   ├── rank.py
│   │   └── plan.py
│   ├── schemas.py
│   └── prompts/
│       ├── summarize.md
│       ├── rank.md
│       └── plan.md
├── web/
│   └── index.html
├── examples/
│   └── sample_reports/
└── tests/
```

## 9. Output schemas (sketch)

```json
{
  "repo": {
    "name": "owner/repo",
    "purpose": "...",
    "stack": ["Python", "..."],
    "setup_steps": ["..."],
    "contribution_rules": ["..."]
  },
  "issues": [
    {
      "number": 123,
      "title": "...",
      "url": "https://github.com/owner/repo/issues/123",
      "fit_score": 0.0,
      "why_this_one": "...",
      "plain_explanation": "...",
      "files_to_touch": [{"path": "...", "reason": "...", "verified": true}],
      "plan": ["Fork the repo", "Clone and create a branch", "..."],
      "effort": "1-2 hours",
      "risks": ["..."]
    }
  ]
}
```

## 10. Evaluation

### Model comparison rubric (scored 1–5 each, by the team on 2–3 repos)
1. **Issue fit:** are the picked issues actually suitable for the stated level?
2. **Accuracy:** do the suggested files exist and make sense?
3. **Clarity:** is the explanation understandable to a beginner?
4. **Actionability:** could someone follow the plan without extra research?
5. **Latency:** total time to result.

### Product success criteria for the hack day
- Works end to end on at least 3 well-known beginner-friendly repos.
- At least 2 models compared with a published results table in the README.
- Offline mode demonstrated live.
- A teammate who has never seen the project can run it from the README.

## 11. Demo plan (2–3 minutes)

1. **Problem (15s):** "Most beginners quit before their first PR."
2. **Run (60s):** paste a repo URL in the web UI, choose "beginner", and show the stages progressing.
3. **Result (45s):** walk through one issue card, then its file list and fork-to-PR plan.
4. **Offline + compare (30s):** turn off Wi-Fi and rerun from cache, then show the side-by-side model comparison.
5. **Open source (10s):** show the repo, license, `SKILL.md`, and how to contribute to FirstPR itself.

## 12. Timeline (one day)

| Block | Work |
|---|---|
| 0:00–0:45 | Lock scope, repo scaffold, license, choose and pull models |
| 0:45–2:15 | GitHub client + cache, issue filtering |
| 2:15–4:00 | Pipeline stages with schemas and prompts; get first end-to-end run in the CLI |
| 4:00–5:15 | Web UI + FastAPI wrapper |
| 5:15–6:00 | `SKILL.md`, offline mode, model-compare command |
| 6:00–7:15 | Test on 3 repos, fix prompt problems, record comparison results |
| 7:15–8:30 | README, demo video, screenshots, submission |

**Cut order if time runs short:** model-compare UI (keep CLI) → Next.js (keep static page) → Markdown export polish → intermediate/advanced tuning (keep beginner).

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Small models return invalid JSON | Pydantic validation, one repair retry, constrained/JSON-mode where available |
| Model hallucinates files | Cross-check against the fetched tree and mark unverified paths as "guess" |
| GitHub rate limits | Disk cache, optional token, depth-limited fetching |
| Slow inference on CPU | Use 7B–8B quantized models, truncate and chunk inputs, show per-stage progress |
| Repos with no `good first issue` labels | Fall back to `help wanted`, docs, and typo issues; say so clearly |
| Scope creep | Beginner level first; cut list above |

## 14. Submission checklist

- [ ] Public GitHub repo with MIT/Apache-2.0 license
- [ ] README: pitch, problem, how open-weight AI is used, setup, screenshots/GIF, model comparison table
- [ ] `SKILL.md` included and documented
- [ ] `.env.example` only; no secrets committed
- [ ] 2–3 minute demo video
- [ ] Project description stating which open-weight models are used and how
- [ ] Correct challenge selected on the submission page

## 15. Open questions

1. Which two models do we compare? (Proposal: Qwen2.5-Coder 7B vs Llama 3.x 8B.)
2. Do we ship the web UI as one static HTML page or a Next.js app?
3. Should the CLI also output JSON for scripting?
4. Can one project be entered in both tracks? (Check the submission page.)

## 16. Future work

- Support GitLab and Codeberg
- Track a user's contribution progress
- Maintainer mode: audit and improve a repo's own `good first issue` labels
- Browser extension on the GitHub issues page
