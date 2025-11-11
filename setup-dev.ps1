# Rydora Development Setup Script for PowerShell
# This script sets up the development environment

# Colors for output
function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host $Message -ForegroundColor $ForegroundColor
}

Write-ColorOutput "Blue" "=== Rydora Development Setup ==="
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-ColorOutput "Green" "âœ“ Node.js version: $nodeVersion"
} catch {
    Write-ColorOutput "Red" "Error: Node.js is not installed or not in PATH"
    Write-ColorOutput "Yellow" "Please install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-ColorOutput "Green" "âœ“ npm version: $npmVersion"
} catch {
    Write-ColorOutput "Red" "Error: npm is not available"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install server dependencies
Write-ColorOutput "Blue" "Installing server dependencies..."
try {
    npm install | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-ColorOutput "Green" "âœ“ Server dependencies installed successfully!"
} catch {
    Write-ColorOutput "Red" "Error: Failed to install server dependencies - $($_.Exception.Message)"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install client dependencies
Write-ColorOutput "Blue" "Installing client dependencies..."
try {
    Push-Location client
    npm install | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Pop-Location
    Write-ColorOutput "Green" "âœ“ Client dependencies installed successfully!"
} catch {
    Write-ColorOutput "Red" "Error: Failed to install client dependencies - $($_.Exception.Message)"
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Setup environment file
if (-not (Test-Path ".env")) {
    if (Test-Path "env.example") {
        Write-ColorOutput "Blue" "Setting up environment file..."
        Copy-Item "env.example" ".env"
        Write-ColorOutput "Green" "âœ“ Environment file created from template"
        Write-ColorOutput "Yellow" "Please edit .env with your configuration"
    } else {
        Write-ColorOutput "Yellow" "Warning: No env.example file found"
    }
} else {
    Write-ColorOutput "Green" "âœ“ Environment file already exists"
}

# Setup client environment file
if (-not (Test-Path "client\.env.local")) {
    Write-ColorOutput "Blue" "Setting up client environment file..."
    @"
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=Rydora
REACT_APP_VERSION=1.0.0
"@ | Out-File -FilePath "client\.env.local" -Encoding utf8
    Write-ColorOutput "Green" "âœ“ Client environment file created"
} else {
    Write-ColorOutput "Green" "âœ“ Client environment file already exists"
}

Write-Host ""

# Check if Docker is available (optional)
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-ColorOutput "Green" "âœ“ Docker available: $dockerVersion"
    }
} catch {
    Write-ColorOutput "Yellow" "Note: Docker not available (optional for development)"
}

Write-Host ""
Write-ColorOutput "Green" "=== Setup Complete! ==="
Write-Host ""

Write-ColorOutput "Blue" "Next steps:"
Write-Host "1. Edit .env file with your configuration"
Write-Host "2. Start development servers: npm run dev"
Write-Host ""

Write-ColorOutput "Blue" "Available commands:"
Write-Host "- npm run dev          Start both client and server"
Write-Host "- npm run server       Start server only (port 5000)"
Write-Host "- npm run client       Start client only (port 3000)"
Write-Host "- npm run build        Build client for production"
Write-Host ""

Write-ColorOutput "Blue" "Development URLs:"
Write-Host "- Client: http://localhost:3000"
Write-Host "- Server: http://localhost:5000"
Write-Host "- API:    http://localhost:5000/api"
Write-Host "- Health: http://localhost:5000/api/health"
Write-Host ""

Write-ColorOutput "Blue" "Production deployment:"
Write-Host "- Build image: .\build-production.bat"
Write-Host "- See QNAP-DEPLOYMENT-GUIDE.md for deployment"
Write-Host ""

$startNow = Read-Host "Would you like to start the development servers now? (y/n)"
if ($startNow -eq "y" -or $startNow -eq "Y") {
    Write-ColorOutput "Blue" "Starting development servers..."
    npm run dev
} else {
    Write-ColorOutput "Green" "Setup complete! Run 'npm run dev' when ready to start."
    Read-Host "Press Enter to exit"
}

