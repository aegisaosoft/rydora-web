# Rydora Production Build Script for Windows PowerShell
# This script builds the production application for Azure deployment

param(
    [switch]$Test
)

# Configuration
$IMAGE_NAME = "rydora"
$IMAGE_TAG = "production"

# Color output function
function Write-ColorOutput {
    param(
        [string]$Color,
        [string]$Message
    )
    
    switch ($Color) {
        "Red" { Write-Host $Message -ForegroundColor Red }
        "Green" { Write-Host $Message -ForegroundColor Green }
        "Yellow" { Write-Host $Message -ForegroundColor Yellow }
        "Blue" { Write-Host $Message -ForegroundColor Blue }
        default { Write-Host $Message }
    }
}

Write-ColorOutput "Blue" "=== Rydora Production Build Script ==="
Write-ColorOutput "Blue" "Building application for Azure Web App deployment"

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-ColorOutput "Green" "âœ“ Node.js is installed: $nodeVersion"
} catch {
    Write-ColorOutput "Red" "Error: Node.js is not installed. Please install Node.js and try again."
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-ColorOutput "Green" "âœ“ npm is installed: $npmVersion"
} catch {
    Write-ColorOutput "Red" "Error: npm is not installed. Please install npm and try again."
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
Write-ColorOutput "Blue" "Installing dependencies..."
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "Error: Failed to install dependencies"
    Read-Host "Press Enter to exit"
    exit 1
}

# Build React client
Write-ColorOutput "Blue" "Building React client..."
Set-Location client
npm ci
npm run build
Set-Location ..
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "Error: Failed to build React client"
    Read-Host "Press Enter to exit"
    exit 1
}

# Create deployment package
Write-ColorOutput "Blue" "Creating deployment package..."
if (Test-Path "deploy-package") {
    Remove-Item -Recurse -Force "deploy-package"
}
New-Item -ItemType Directory -Path "deploy-package" | Out-Null
Copy-Item -Recurse -Path "server" -Destination "deploy-package\server"
Copy-Item -Recurse -Path "client\build" -Destination "deploy-package\client\build"
Copy-Item -Path "package.json" -Destination "deploy-package\"
Copy-Item -Path "web.config" -Destination "deploy-package\"

# Install production dependencies in deployment package
Write-ColorOutput "Blue" "Installing production dependencies..."
Set-Location deploy-package
npm ci --only=production
Set-Location ..

# Create zip file for deployment
Write-ColorOutput "Blue" "Creating deployment zip file..."
$zipFile = "rydora-deployment.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}
Compress-Archive -Path "deploy-package\*" -DestinationPath $zipFile -Force

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "Error: Failed to create deployment package"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-ColorOutput "Green" "âœ“ Deployment package created successfully!"

# Show package details
$packageSize = (Get-Item $zipFile).Length
Write-ColorOutput "Green" "Package size: $packageSize bytes"

Write-ColorOutput "Green" "=== Build completed successfully! ==="
Write-ColorOutput "Blue" "Next steps:"
Write-Host "1. Deploy to Azure Web App using GitHub Actions"
Write-Host "2. Or use Azure CLI: az webapp deploy --name RYDORA-web-us-2025 --resource-group RYDORA_web --src-path $zipFile --type zip"
Write-Host "3. Check deployment status in Azure Portal"

# Clean up
Remove-Item -Recurse -Force "deploy-package"

Read-Host "Press Enter to exit"
