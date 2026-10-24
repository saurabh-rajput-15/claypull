# ClayPull 🛠️ Local Development & Setup Guide

This guide walks you through setting up and running **ClayPull** locally on **Windows**, **macOS**, or **Linux**.

---

## ⚡ 1-Minute Automated Setup

ClayPull includes an automated setup wizard that checks your Node.js runtime, generates `.env`, verifies local Ollama connectivity, and validates CLI & MCP binaries.

### On Windows (PowerShell)
```powershell
.\setup.ps1
```

### On macOS / Linux / WSL
```bash
chmod +x setup.sh
./setup.sh
```

### Cross-Platform via npm
```bash
npm run setup
```

Once the wizard completes, start the local development server:
```bash
npm run dev
```
Open **[http://localhost:5174/](http://localhost:5174/)** in your browser.

---

## 📋 System Prerequisites

| Requirement | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Node.js** | `v18.0.0+` | `v20.x` or `v22.x` | Required runtime (`node -v`) |
| **npm** | `v9.0.0+` | `v10.x` | Comes bundled with Node.js |
| **Git** | `2.x+` | Latest | For cloning and version control |
| **Ollama** *(Optional)* | Latest | Latest | For local private AI models |

---

## 🚀 Step-by-Step Manual Setup

### 1. Clone the Repository
```bash
git clone https://github.com/saurabh-rajput-15/firstpr.git
cd firstpr
```

### 2. Install Node Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the template configuration file:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On macOS / Linux:
cp .env.example .env
```

The default `.env` is configured for local development:
```ini
# Local Ollama endpoint
VITE_OLLAMA_ENDPOINT=http://localhost:11434

# Default coding model
VITE_DEFAULT_MODEL=qwen2.5-coder:7b

# Optional GitHub Personal Access Token (raises rate limit from 60 to 5,000 req/hr)
VITE_GITHUB_TOKEN=
```

### 4. Start the Development Server
```bash
npm run dev
```

The application will launch on `http://localhost:5174/` (or `5173`).

---

## 🦙 Setting Up Local Ollama (Recommended)

ClayPull is designed from the ground up to run on **local open-weight AI models** using [Ollama](https://ollama.com/), keeping your code and analysis 100% private.

### 1. Install Ollama
- **Windows**: Download the installer from [ollama.com/download/windows](https://ollama.com/download/windows).
- **macOS**: `brew install ollama` or download from [ollama.com/download/mac](https://ollama.com/download/mac).
- **Linux**: Run `curl -fsSL https://ollama.com/install.sh | sh`.

### 2. Start the Ollama Service
Make sure Ollama is running in your background or terminal:
```bash
ollama serve
```

### 3. Pull Recommended Coding Models
We recommend **Qwen 2.5 Coder 7B** (outstanding at code architecture) or **Llama 3.2**:
```bash
# Recommended for code analysis:
ollama run qwen2.5-coder:7b

# Lightweight alternative:
ollama run llama3.2:latest
```

### 4. Running Ollama Locally vs Deployed Link (https://claypull.vercel.app/)

#### A. Running Locally (`http://localhost:5174/`)
When running `npm run dev` locally, Vite automatically proxies `/ollama` to `http://localhost:11434`. Zero CORS configuration or flags needed!

#### B. Connecting Local Ollama to Deployed Link (`https://claypull.vercel.app/`)
Modern browsers restrict HTTPS websites (`https://claypull.vercel.app`) from calling unencrypted local HTTP ports (`http://localhost:11434`) due to mixed-content security.

ClayPull provides 3 straightforward ways to use Ollama with the deployed link:
1. **Instant HTTPS Tunnel (Easiest)**:
   Run the built-in tunnel command in your terminal:
   ```bash
   npm run tunnel
   ```
   *(Or run `npx localtunnel --port 11434`)*. Copy the generated `https://...` link and paste it into the **Endpoint URL** field at [https://claypull.vercel.app/](https://claypull.vercel.app/).
2. **Start Ollama with Allowed Origins**:
   ```bash
   # On Windows PowerShell:
   $env:OLLAMA_ORIGINS="*" ; ollama serve

   # On macOS / Linux:
   OLLAMA_ORIGINS="*" ollama serve
   ```
3. **Vercel Serverless Function Proxy (`/api/ollama`)**:
   The deployed link automatically routes remote and cloud Ollama instances through the built-in `/api/ollama` serverless proxy on Vercel, bypassing all browser CORS restrictions completely!

---

## 🌐 Alternative AI Engines

If you do not have Ollama installed or want cloud-hosted intelligence:

### Option A: Zero-Setup Offline Demo Mode
- In the UI: Check the **"Run in Demo Mode"** box.
- In the CLI: Add the `--demo` flag:
  ```bash
  npm run cli -- analyze facebook/react --demo
  ```
- *No API keys, no local models, and no downloads required.* Perfect for instant evaluation and hackathon judging!

### Option B: Cloud APIs (Groq, OpenRouter, OpenAI, DeepSeek)
1. Open the ClayPull Studio Dashboard: `http://localhost:5174/dashboard`.
2. Navigate to **Model & API Settings** in the sidebar.
3. Choose your provider:
   - **Groq Cloud** (Ultra-fast `llama-3.3-70b-versatile`)
   - **OpenRouter** (Unified API for Anthropic, Claude, DeepSeek)
   - **OpenAI** (`gpt-4o-mini`, `gpt-4o`)
   - **DeepSeek** (`deepseek-coder`, `deepseek-chat`)
4. Paste your API key. (Keys are stored strictly in your browser's local storage and are never logged or sent to third-party tracking servers).

---

## 🔌 Model Context Protocol (MCP) Server Setup

ClayPull includes a native Model Context Protocol (MCP) server located in [`mcp/server.js`](mcp/server.js). This allows AI IDEs to directly call ClayPull's analysis tools.

### Test the MCP Server
```bash
node mcp/server.js
```
The server runs on standard I/O (stdio) and responds to JSON-RPC 2.0 messages.

### Connect to Google Antigravity IDE
Add the following configuration to your Antigravity IDE MCP configuration:
```json
{
  "mcpServers": {
    "claypull": {
      "command": "node",
      "args": ["c:/Users/saura/Downloads/hacktoberfest/mcp/server.js"],
      "env": {
        "OLLAMA_ENDPOINT": "http://localhost:11434"
      }
    }
  }
}
```

### Connect to Claude Desktop
Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
```json
{
  "mcpServers": {
    "claypull": {
      "command": "node",
      "args": ["<ABSOLUTE_PATH_TO_PROJECT>/mcp/server.js"]
    }
  }
}
```

### Connect to Cursor
Add to your project's `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "claypull": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp/server.js"]
    }
  }
}
```

---

## 💻 CLI Usage

ClayPull includes a full-featured terminal CLI for headless analysis and CI scripting:

```bash
# View CLI help
npm run cli -- --help

# Analyze a repository using offline demo engine
npm run cli -- analyze facebook/react --demo

# Analyze using local Ollama model
npm run cli -- analyze pallets/flask --model qwen2.5-coder:7b

# Export analysis as a Markdown report file
npm run cli -- analyze torvalds/linux --demo --out linux-report.md

# Compare two models on the same repository
npm run cli -- compare facebook/react --model1 qwen2.5-coder:7b --model2 llama3.2:latest
```

---

## 🧪 Verification & Production Build

### Run ESLint Verification
```bash
npm run lint
```
*Expected: 0 errors, 0 warnings.*

### Run Production Build
```bash
npm run build
```
*Executes TypeScript strict type check (`tsc -b`) and Vite production bundling.*

### Preview Production Build
```bash
npm run preview
```

---

## ❓ Troubleshooting & FAQs

### 1. `FetchError: connect ECONNREFUSED 127.0.0.1:11434`
- **Cause**: Local Ollama service is not running.
- **Solution**: Open a terminal and run `ollama serve`, or use **Demo Mode** / **Cloud API**.

### 2. GitHub API Rate Limit (403 Forbidden)
- **Cause**: Unauthenticated GitHub API requests are limited to 60 calls/hr per IP.
- **Solution**: Create a free GitHub Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens) (no permissions required for public repos) and add it to your `.env` as `VITE_GITHUB_TOKEN=ghp_...` or in the Studio UI.

### 3. Port `5173` is already in use
- **Cause**: Another local dev server is using port 5173.
- **Solution**: Vite will automatically select the next free port (e.g. `5174`), or you can pass `npm run dev -- --port 3000`.

---

## 🤝 Contributing

1. Fork the repo on GitHub: [github.com/saurabh-rajput-15/firstpr](https://github.com/saurabh-rajput-15/firstpr)
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request!
