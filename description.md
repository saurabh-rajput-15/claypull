# ClayPull 🚀 — Project Submission

> **Event:** Hacktoberfest Hack Day Dhule × ARIF  
> **Track:** Best Open-Source AI Project  
> **Project Name:** ClayPull  
> **Tagline:** Open-Source Contribution Coach & AI IDE Studio  
> **Author:** Saurabh Rajput ([@saurabh-rajput-15](https://github.com/saurabh-rajput-15))  
> **Repository:** [https://github.com/saurabh-rajput-15/firstpr.git](https://github.com/saurabh-rajput-15/firstpr.git)  
> **License:** MIT License  

---

## 💡 Inspiration & Problem Statement

Every year during **Hacktoberfest**, thousands of eager developers attempt to make their very first open-source contribution. However, the drop-off rate is heartbreakingly high. Beginners face four intimidating barriers:

1. **The Codebase Maze**: Enterprise open-source repositories consist of hundreds of nested directories and complex configuration files. Newcomers have no clue where to start or how the architecture fits together.
2. **The "Good First Issue" Trap**: Countless tickets labeled `good first issue` are years out of date, already claimed by other developers, or mask deceptively difficult architectural refactors.
3. **Fear of Blast Radius**: Beginners are terrified of modifying core modules, breaking existing test suites, or submitting PRs that fail maintainer conventions.
4. **Cloud Lock-in & Privacy**: Most modern AI developer tools require expensive monthly subscriptions, require credit cards, or send proprietary code to third-party cloud servers.

**ClayPull** was born to solve this: a 100% private, local AI contribution coach and studio designed to guide developers from repository URL to their first accepted Pull Request with zero friction.

---

## ✨ What ClayPull Does

ClayPull transforms any GitHub repository into an interactive, step-by-step contribution roadmap:

* **Setup Friction Score (1-10)**: Analyzes project setup commands, dependencies, build scripts, and test runners, rating how difficult the repo is to run locally (from *Effortless* to *Steep*).
* **Maintainer Velocity & Welcoming Index**: Tracks recent commit cadence, PR turnaround time, and response rates so beginners pick active, welcoming projects.
* **Blast Radius Analysis**: Evaluates open beginner issues and tags them as `Low / Isolated` (safe documentation, typos, isolated component tweaks) vs `Moderate` (logic changes touching shared utils).
* **Git Tree File Verification**: Cross-checks prospective edit targets against the actual live GitHub Git tree to distinguish verified files (`✓ verified`) from guessed ones (`? guess`), eliminating LLM hallucinations.
* **Interactive Fork-to-PR Checklist**: Provides checkable milestone steps (`git clone`, branch creation, file modification, test execution, PR drafting) with copyable terminal commands.
* **Master Prompt Studio**: Automatically writes surgical instructions tailored for 5 leading AI developer tools:
  1. **Claude Code CLI** (`claude "..."`)
  2. **Google Antigravity** (Structured `<TASK>`, `<SURGICAL_TARGET_FILES>`, and `<VERIFICATION_CRITERIA>` blocks)
  3. **Cursor & Windsurf** (`@file` syntax and regression safeguards)
  4. **GitHub Copilot / Codex** (Context headers)
  5. **Aider** (Terminal git-aware pair programming command)
* **Native Model Context Protocol (MCP) Server**: A stdio JSON-RPC 2.0 server allowing AI IDEs (Google Antigravity IDE, Claude Desktop, Cursor, Windsurf) to call ClayPull tools directly from within their chat interfaces!
* **Model Benchmark & Comparison Mode (FR-21)**: Side-by-side evaluation comparing two AI models on the same repository with real-time latency and rubric scores.

---

## 🎨 Design Philosophy: The Clay.com Aesthetic

ClayPull embraces the warm, playful, and human-centric design language of **Clay.com**:
* **Cream Canvas Atmosphere (`#fffaf0`)**: A warm, welcoming foundation that replaces cold gray developer dashboards.
* **Plain Black Display Typography**: Bold, tight-tracking headlines paired with crisp, readable Inter body text.
* **High-Contrast Surface Cards (`#ffffff`)**: Clean, white cards with delicate warm hairline borders (`#eadbc8`) and subtle 4px top accent lines (Emerald, Teal, Amber, Coral, Indigo) for effortless reading without visual fatigue.
* **3D Claymation Art**: Whimsical clay landscape art and mascots celebrating the contributor's journey from "lost in code" to "first PR".
* **Unified Warm Footer**: Seamless cream footer throughout the experience with zero jarring dark breaks.

---

## 🛠️ How We Built It

ClayPull is engineered with a modern, production-ready stack:

### Frontend & UI
* **React 19** (`^19.3.1`) & **TypeScript 6** (`~6.0.3`): Ultra-strict typing with React 19 concurrent features.
* **Vite 8** (`^8.3.4`): Instant HMR and lightning-fast production bundle compilation (< 1.1s).
* **Lucide Icons** (`lucide-react`): Crisp iconography for developer workflows.
* **React Error Boundary**: Graceful error catching with Clay-styled recovery.
* **Zero External Router Bloat**: Lightweight dual-page routing (`/` Landing Page and `/dashboard` Studio) powered by native HTML5 History API and persistent `localStorage` synchronization.

### AI Inference & Pluggable Backends
* **Local Ollama Support**: Zero data egress. Runs seamlessly with open-weight models like `qwen2.5-coder:7b` and `llama3.2`.
* **Automated Vite CORS Proxy**: Configured a reverse proxy in `vite.config.ts` mapping `/ollama` to `http://localhost:11434`, resolving browser CORS restrictions out of the box.
* **Cloud API Presets**: 1-click presets for **Groq Cloud** (`llama-3.3-70b-versatile`), **OpenRouter**, **OpenAI** (`gpt-4o-mini`), and **DeepSeek**.
* **Zero-Setup Offline Demo Mode**: Built-in mock engine providing instant, deterministic results for hackathon judges and offline workshops.

### Extensibility & Protocol Standards
* **Model Context Protocol (MCP)**: Native stdio JSON-RPC 2.0 server (`mcp/server.js`) exposing:
  - `claypull_analyze_repo`
  - `claypull_triage_beginner_issues`
  - `claypull_generate_pr_plan`
  - `claypull_export_agent_prompt`
* **Standalone CLI**: Executable terminal tool in [`bin/claypull.js`](bin/claypull.js) with alias forwarding for [`bin/firstpr.js`](bin/firstpr.js).
* **Automated Setup Wizard**: Cross-platform setup scripts (`scripts/setup.js`, `setup.ps1`, `setup.sh`, `npm run setup`) that verify Node.js runtime, configure `.env`, ping Ollama, and validate binaries.

---

## 🧗 Challenges & Solutions

| Challenge | Solution |
|---|---|
| **Browser CORS on `localhost:11434`** | Web browsers block client-side fetch calls to Ollama's local port due to CORS. We implemented a Vite development reverse proxy at `/ollama` that transparently forwards requests without requiring users to configure custom environment headers on their Ollama daemon. |
| **LLM File Hallucinations** | Standard AI models frequently suggest modifying imaginary file paths. ClayPull fetches the repository's live Git directory tree via the GitHub Trees API and cross-verifies every suggested file, tagging them as `✓ verified` or `? guess`. |
| **Stale "Good First Issue" Tags** | Many beginner tags on GitHub are abandoned. ClayPull filters out issues with assignees or open linked PRs, removes issues inactive for > 12 months, and classifies Blast Radius to protect beginners. |
| **Visual Balance & Eye Strain** | Early designs used solid, saturated hot-pink and purple card backgrounds that overwhelmed the screen. We refined the design system into clean white cards (`#ffffff`) with warm borders and 4px colored accent stripes, giving the app a state-of-the-art SaaS look. |

---

## 🏆 Accomplishments & Production Milestones

- ✅ **0 ESLint Errors / Warnings**: Enforces strict code quality (`eslint .`).
- ✅ **Strict TypeScript Compilation**: Clean type checking with zero `any` leaks.
- ✅ **Automated CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`) validates lint, build, and CLI functionality on every push to `main`.
- ✅ **100% Client-Side Privacy**: API keys and tokens remain exclusively in the user's browser `localStorage`; zero tracking or telemetry.
- ✅ **MCP IDE Ready**: Ready-to-copy configurations for Google Antigravity, Claude Desktop, Cursor, and Windsurf.

---

## 🚀 Quick Evaluation Guide for Judges (Under 30 Seconds)

We know judges have limited time! You can test ClayPull instantly without installing Ollama or acquiring API keys:

### 1. Instant Launch
```bash
git clone https://github.com/saurabh-rajput-15/firstpr.git
cd firstpr
npm install
npm run dev
```

### 2. View in Browser
- **Landing Page**: [http://localhost:5174/](http://localhost:5174/)
- **Studio Dashboard**: [http://localhost:5174/dashboard](http://localhost:5174/dashboard)
- *Click the **"🌱 Quick Try: pallets/flask"** chip and click **Analyze** in Demo Mode to see immediate intelligence!*

### 3. Test the Terminal CLI
```bash
npm run cli -- analyze facebook/react --demo
```

### 4. Test the Health Wizard
```bash
npm run setup
```

---

## 🔮 What's Next for ClayPull

1. **Auto-Branch & Draft PR Generation**: Connect with GitHub OAuth to fork repos, create branches, and open draft pull requests with 1 click.
2. **WebContainer Local Sandbox**: Run unit tests in-browser using WebAssembly containers (Node / Python) before pushing commits.
3. **Open-Source Community Discord & Slack Bots**: Bring ClayPull intelligence directly into Discord and Slack channels to mentor new contributors automatically.

---

<div align="center">
  <sub>Submitted with pride for <strong>Hacktoberfest Hack Day Dhule × ARIF</strong></sub>
</div>
