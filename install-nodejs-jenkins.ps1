# PowerShell script to install Node.js in existing Jenkins container

Write-Host "🔧 Installing Node.js in Jenkins container..." -ForegroundColor Yellow

# Get the Jenkins container ID
$jenkinsContainer = docker ps --filter "ancestor=jenkins/jenkins" --format "{{.ID}}" | Select-Object -First 1

if ([string]::IsNullOrEmpty($jenkinsContainer)) {
    Write-Host "❌ Jenkins container not found. Make sure Jenkins is running." -ForegroundColor Red
    
    # Try to find any Jenkins container
    $allJenkinsContainers = docker ps --filter "name=jenkins" --format "{{.ID}} {{.Names}}"
    if ($allJenkinsContainers) {
        Write-Host "Found these Jenkins-related containers:" -ForegroundColor Yellow
        Write-Host $allJenkinsContainers -ForegroundColor Cyan
        $jenkinsContainer = ($allJenkinsContainers -split '\s+')[0]
        Write-Host "Using container: $jenkinsContainer" -ForegroundColor Green
    } else {
        exit 1
    }
}

Write-Host "✅ Found Jenkins container: $jenkinsContainer" -ForegroundColor Green

# Install Node.js in the container
Write-Host "📦 Installing Node.js 18..." -ForegroundColor Yellow

$installScript = @"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &&
apt-get install -y nodejs &&
echo 'Node.js version:' &&
node --version &&
echo 'NPM version:' &&
npm --version
"@

docker exec -u root $jenkinsContainer bash -c $installScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "Node.js installed successfully!" -ForegroundColor Green
    Write-Host "You can now run your Jenkins pipeline again." -ForegroundColor Cyan
    
    # Verify installation
    Write-Host "Verifying installation..." -ForegroundColor Yellow
    docker exec $jenkinsContainer node --version
    docker exec $jenkinsContainer npm --version
} else {
    Write-Host "Failed to install Node.js" -ForegroundColor Red
    exit 1
}
