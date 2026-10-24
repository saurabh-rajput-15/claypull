# ClayPull — Local Environment Setup Script (PowerShell)
# Usage: .\setup.ps1

Write-Host "Starting ClayPull Local Environment Setup..." -ForegroundColor Cyan

# Check if Node is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed or not in PATH. Please install Node.js 18+ from https://nodejs.org"
    exit 1
}

# Install dependencies if node_modules is missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies with npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed."
        exit $LASTEXITCODE
    }
}

# Run the health check wizard
node scripts/setup.js

Write-Host "`nReady to launch!" -ForegroundColor Green
Write-Host "Run 'npm run dev' to start ClayPull on http://localhost:5174/" -ForegroundColor Cyan
