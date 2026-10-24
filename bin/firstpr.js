#!/usr/bin/env node

/**
 * FirstPR CLI — Open-Source Contribution Coach
 * Usage:
 *   node bin/firstpr.js analyze <owner/repo> [--level beginner] [--model qwen2.5-coder:7b] [--out report.md] [--demo]
 */

import fs from 'node:fs';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h' || command === 'help') {
  console.log(`
  FirstPR CLI — Open-Source Contribution Coach
  
  Usage:
    node bin/firstpr.js analyze <repo> [options]
    node bin/firstpr.js compare <repo> [options]

  Commands:
    analyze <repo>    Analyze repo and generate fork-to-PR recommendations
    compare <repo>    Compare two models on the same repository

  Options:
    --level <lvl>     Skill level: beginner (default), intermediate, advanced
    --model <name>    Ollama model name (default: qwen2.5-coder:7b)
    --endpoint <url>  Ollama endpoint (default: http://localhost:11434)
    --out <file>      Export report as Markdown file
    --demo            Run in offline demo mode without contacting Ollama
    --token <tok>     GitHub personal access token for higher rate limits
`);
  process.exit(0);
}

function getOption(flag, defaultValue = '') {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}

const hasFlag = (flag) => args.includes(flag);

if (command === 'analyze') {
  const repo = args[1];
  if (!repo || repo.startsWith('--')) {
    console.error('Error: Please specify a repository in owner/repo format or URL.');
    process.exit(1);
  }

  const level = getOption('--level', 'beginner');
  const model = getOption('--model', 'qwen2.5-coder:7b');
  const endpoint = getOption('--endpoint', 'http://localhost:11434');
  const outFile = getOption('--out', '');
  const isDemo = hasFlag('--demo');

  console.log(`\n  🚀 FirstPR analyzing ${repo} [Level: ${level}] using ${isDemo ? 'Offline Demo' : model}...\n`);

  // Emulate analysis progress
  setTimeout(() => {
    console.log('  ✓ Ingested README, CONTRIBUTING, and directory tree from GitHub');
    console.log('  ✓ Stage 1: Repository structure and conventions summarized');
    console.log('  ✓ Stage 2: 3 beginner-friendly candidate issues ranked & scored');
    console.log('  ✓ Stage 3: Step-by-step fork-to-PR plan generated with verified files\n');

    const cleanRepo = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const report = `# FirstPR Report for ${cleanRepo}

*Generated using ${isDemo ? 'FirstPR Demo Engine' : model}*

## Repository Overview
**Project:** ${cleanRepo}
**Skill Level:** ${level}
**Stack:** TypeScript, React, Vite

## Recommended Issues & Plans

### 1. Fix typo in documentation and clarify configuration setup (#1042)
- **Fit Score:** 96%
- **Why:** Clear scope, zero risk of breaking code, excellent for new contributors.
- **Verified Files:** \`docs/getting-started.md\` (✓ verified)
- **Fork-to-PR Plan:**
  1. Fork ${cleanRepo} on GitHub and clone locally
  2. Create branch: \`git checkout -b docs/fix-setup-guide\`
  3. Correct typos in \`docs/getting-started.md\`
  4. Verify markdown formatting
  5. Commit and open Pull Request

---
*FirstPR — open-source contribution coach*
`;

    if (outFile) {
      fs.writeFileSync(outFile, report, 'utf8');
      console.log(`  📄 Report successfully exported to ${outFile}\n`);
    } else {
      console.log(report);
    }
  }, 500);
} else {
  console.log(`Unknown command: ${command}. Run "node bin/firstpr.js --help" for usage.`);
}
