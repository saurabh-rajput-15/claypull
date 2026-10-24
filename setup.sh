#!/usr/bin/env bash

# ClayPull — Local Environment Setup Script (Bash / macOS / Linux / WSL)
# Usage: ./setup.sh

set -e

echo -e "\033[36mStarting ClayPull Local Environment Setup...\033[0m"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\033[31mError: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org\033[0m"
    exit 1
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo -e "\033[33mInstalling dependencies with npm install...\033[0m"
    npm install
fi

# Run the health check wizard
node scripts/setup.js

echo -e "\n\033[32mReady to launch!\033[0m"
echo -e "\033[36mRun 'npm run dev' to start ClayPull on http://localhost:5174/\033[0m"
