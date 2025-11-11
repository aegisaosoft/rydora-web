# Jenkins Setup Script for Windows
param(
    [switch]$Force = $false
)

Write-Host "ðŸš€ Setting up Jenkins with Node.js for Rydora project" -ForegroundColor Green

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "âœ… Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "âŒ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is installed
try {
    $composeVersion = docker-compose --version
    Write-Host "âœ… Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "âŒ Docker Compose is not installed. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Build custom Jenkins image with Node.js
Write-Host "ðŸ”¨ Building custom Jenkins image with Node.js..." -ForegroundColor Yellow
docker build -f Dockerfile.jenkins -t RYDORA-jenkins:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "âŒ Failed to build Jenkins image" -ForegroundColor Red
    exit 1
}

Write-Host "âœ… Custom Jenkins image built successfully" -ForegroundColor Green

# Create jenkins_home directory
Write-Host "ðŸ“ Creating Jenkins home directory..." -ForegroundColor Yellow
if (!(Test-Path "jenkins_home")) {
    New-Item -ItemType Directory -Path "jenkins_home" | Out-Null
}

# Start Jenkins using Docker Compose
Write-Host "ðŸš€ Starting Jenkins..." -ForegroundColor Yellow
docker-compose -f docker-compose.jenkins.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "âŒ Failed to start Jenkins" -ForegroundColor Red
    exit 1
}

Write-Host "â³ Waiting for Jenkins to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Get initial admin password
$passwordFile = "jenkins_home\secrets\initialAdminPassword"
if (Test-Path $passwordFile) {
    Write-Host "ðŸ”‘ Jenkins initial admin password:" -ForegroundColor Cyan
    Get-Content $passwordFile
    Write-Host ""
}

Write-Host "âœ… Jenkins setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "ðŸŒ Access Jenkins at: http://localhost:8080" -ForegroundColor Cyan
Write-Host "ðŸ“‹ Next steps:" -ForegroundColor Yellow
Write-Host "   1. Open http://localhost:8080 in your browser"
Write-Host "   2. Use the initial admin password shown above"
Write-Host "   3. Install suggested plugins"
Write-Host "   4. Create your first admin user"
Write-Host "   5. Create a new Pipeline job pointing to your GitHub repository"
Write-Host ""
Write-Host "ðŸ”§ Jenkins includes:" -ForegroundColor Green

try {
    $nodeVersion = docker exec RYDORA-jenkins node --version
    $npmVersion = docker exec RYDORA-jenkins npm --version
    Write-Host "   âœ… Node.js $nodeVersion" -ForegroundColor Green
    Write-Host "   âœ… NPM $npmVersion" -ForegroundColor Green
    Write-Host "   âœ… Git" -ForegroundColor Green
    Write-Host "   âœ… Required Jenkins plugins" -ForegroundColor Green
} catch {
    Write-Host "   â³ Jenkins is still starting up..." -ForegroundColor Yellow
}

