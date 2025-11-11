# Rydora Windows Server Deployment Script
# This script deploys the Rydora application to a Windows Server with IIS

param(
    [string]$Action = "deploy",
    [string]$DeployPath = "C:\inetpub\wwwroot\rydora",
    [string]$NodeVersion = "18",
    [int]$Port = 5000
)

# Configuration
$ServiceName = "Rydora Application"
$AppPoolName = "RYDORAUSAppPool"
$SiteName = "Rydora"
$LogPath = "$DeployPath\logs"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { $Red }
        "WARNING" { $Yellow }
        "SUCCESS" { $Green }
        default { $Blue }
    }
    
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

# Error handling
function Handle-Error {
    param([string]$Message)
    Write-Log $Message "ERROR"
    exit 1
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Install Node.js if not present
function Install-NodeJS {
    Write-Log "Checking Node.js installation..."
    
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Installing Node.js $NodeVersion..."
            
            $nodeInstaller = "node-v$NodeVersion.0-x64.msi"
            $nodeUrl = "https://nodejs.org/dist/v$NodeVersion.0/$nodeInstaller"
            
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
            Start-Process msiexec -ArgumentList "/i $nodeInstaller /quiet /norestart" -Wait
            Remove-Item $nodeInstaller -Force
            
            # Refresh PATH
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
            
            Write-Log "Node.js installed successfully" "SUCCESS"
        } else {
            Write-Log "Node.js is already installed: $nodeVersion" "SUCCESS"
        }
    }
    catch {
        Handle-Error "Failed to install Node.js: $($_.Exception.Message)"
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Log "Installing dependencies..."
    
    try {
        # Root dependencies
        npm ci --only=production
        if ($LASTEXITCODE -ne 0) { throw "Failed to install root dependencies" }
        
        # Client dependencies
        Set-Location "client"
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "Failed to install client dependencies" }
        Set-Location ".."
        
        Write-Log "Dependencies installed successfully" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to install dependencies: $($_.Exception.Message)"
    }
}

# Build React application
function Build-Application {
    Write-Log "Building React application..."
    
    try {
        Set-Location "client"
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Failed to build React application" }
        Set-Location ".."
        
        Write-Log "Application built successfully" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to build application: $($_.Exception.Message)"
    }
}

# Prepare server files
function Prepare-ServerFiles {
    Write-Log "Preparing server files..."
    
    try {
        # Create directories
        if (!(Test-Path $DeployPath)) {
            New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null
        }
        if (!(Test-Path "$DeployPath\public")) {
            New-Item -ItemType Directory -Path "$DeployPath\public" -Force | Out-Null
        }
        if (!(Test-Path $LogPath)) {
            New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
        }
        
        # Copy server files
        Copy-Item -Path "server\*" -Destination $DeployPath -Recurse -Force
        Copy-Item -Path "package.json" -Destination $DeployPath -Force
        if (Test-Path "package-lock.json") {
            Copy-Item -Path "package-lock.json" -Destination $DeployPath -Force
        }
        
        # Copy client build
        Copy-Item -Path "client\build\*" -Destination "$DeployPath\public" -Recurse -Force
        
        Write-Log "Server files prepared in $DeployPath" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to prepare server files: $($_.Exception.Message)"
    }
}

# Install server dependencies
function Install-ServerDependencies {
    Write-Log "Installing server production dependencies..."
    
    try {
        Set-Location $DeployPath
        npm ci --only=production
        if ($LASTEXITCODE -ne 0) { throw "Failed to install server dependencies" }
        Set-Location ".."
        
        Write-Log "Server dependencies installed successfully" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to install server dependencies: $($_.Exception.Message)"
    }
}

# Create Windows service
function Create-WindowsService {
    Write-Log "Creating Windows service..."
    
    try {
        # Install node-windows globally
        npm install -g node-windows
        
        # Create service installation script
        $serviceScript = @"
var Service = require('node-windows').Service;

var svc = new Service({
  name: '$ServiceName',
  description: 'Rydora Toll Management Platform',
  script: '$DeployPath\\index.js',
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: [
    { name: "NODE_ENV", value: "production" },
    { name: "PORT", value: "$Port" }
  ]
});

svc.on('install', function(){
  svc.start();
  console.log('Service installed and started');
});

svc.on('start', function(){
  console.log('Service started');
});

svc.on('error', function(err){
  console.error('Service error:', err);
});

// Uninstall existing service if it exists
svc.uninstall();
setTimeout(() => {
  svc.install();
}, 2000);
"@
        
        $serviceScript | Out-File -FilePath "$DeployPath\install-service.js" -Encoding UTF8
        
        # Install the service
        Set-Location $DeployPath
        node install-service.js
        Set-Location ".."
        
        Write-Log "Windows service created successfully" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to create Windows service: $($_.Exception.Message)"
    }
}

# Configure IIS
function Configure-IIS {
    Write-Log "Configuring IIS..."
    
    try {
        # Enable IIS features
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-DirectoryBrowsing -All -NoRestart | Out-Null
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET45 -All -NoRestart | Out-Null
        
        # Install URL Rewrite module
        $rewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
        $rewriteInstaller = "rewrite_amd64_en-US.msi"
        Invoke-WebRequest -Uri $rewriteUrl -OutFile $rewriteInstaller
        Start-Process msiexec -ArgumentList "/i $rewriteInstaller /quiet /norestart" -Wait
        Remove-Item $rewriteInstaller -Force
        
        # Create application pool
        Import-Module WebAdministration
        if (Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue) {
            Remove-WebAppPool -Name $AppPoolName
        }
        New-WebAppPool -Name $AppPoolName
        Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name "processModel.identityType" -Value "ApplicationPoolIdentity"
        Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name "managedRuntimeVersion" -Value ""
        
        # Create website
        if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
            Remove-Website -Name $SiteName
        }
        New-Website -Name $SiteName -Port 80 -PhysicalPath "$DeployPath\public" -ApplicationPool $AppPoolName
        
        # Create web.config for URL rewriting
        $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:$Port/api/{R:1}" />
        </rule>
        <rule name="React Router" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <httpCompression>
      <dynamicTypes>
        <add mimeType="application/json" enabled="true" />
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="text/css" enabled="true" />
      </dynamicTypes>
      <staticTypes>
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="text/css" enabled="true" />
      </staticTypes>
    </httpCompression>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
"@
        
        $webConfig | Out-File -FilePath "$DeployPath\public\web.config" -Encoding UTF8
        
        # Set permissions
        icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)F" /T | Out-Null
        icacls $DeployPath /grant "IUSR:(OI)(CI)F" /T | Out-Null
        
        Write-Log "IIS configured successfully" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to configure IIS: $($_.Exception.Message)"
    }
}

# Configure Windows Firewall
function Configure-Firewall {
    Write-Log "Configuring Windows Firewall..."
    
    try {
        # Allow HTTP traffic
        New-NetFirewallRule -DisplayName "Rydora HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow | Out-Null
        New-NetFirewallRule -DisplayName "Rydora API" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
        
        Write-Log "Firewall configured successfully" "SUCCESS"
    }
    catch {
        Write-Log "Failed to configure firewall: $($_.Exception.Message)" "WARNING"
    }
}

# Deploy application
function Deploy-Application {
    Write-Log "Deploying application..."
    
    try {
        # Stop existing service if running
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq "Running") {
            Stop-Service -Name $ServiceName -Force
            Start-Sleep -Seconds 5
        }
        
        # Start the service
        Start-Service -Name $ServiceName
        Start-Sleep -Seconds 10
        
        # Check service status
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq "Running") {
            Write-Log "Service started successfully" "SUCCESS"
        } else {
            throw "Service failed to start"
        }
        
        Write-Log "Application deployed successfully" "SUCCESS"
    }
    catch {
        Handle-Error "Failed to deploy application: $($_.Exception.Message)"
    }
}

# Health check
function Test-Health {
    Write-Log "Performing health check..."
    
    try {
        # Wait for application to be ready
        $maxAttempts = 30
        $attempt = 0
        
        do {
            $attempt++
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Log "Application is healthy" "SUCCESS"
                    break
                }
            }
            catch {
                if ($attempt -ge $maxAttempts) {
                    throw "Application health check failed after $maxAttempts attempts"
                }
                Write-Log "Waiting for application to start... (attempt $attempt/$maxAttempts)"
                Start-Sleep -Seconds 2
            }
        } while ($attempt -lt $maxAttempts)
        
        # Test the main application
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/" -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Log "Application is accessible via IIS" "SUCCESS"
            }
        }
        catch {
            Write-Log "Warning: Application may not be accessible via IIS" "WARNING"
        }
    }
    catch {
        Write-Log "Health check failed: $($_.Exception.Message)" "WARNING"
    }
}

# Create monitoring scripts
function Create-MonitoringScripts {
    Write-Log "Creating monitoring scripts..."
    
    try {
        # Service monitoring script
        $monitorScript = @"
@echo off
sc query "$ServiceName" | find "RUNNING" >nul
if errorlevel 1 (
    echo Service is not running, attempting to start...
    sc start "$ServiceName"
) else (
    echo Service is running
)
"@
        $monitorScript | Out-File -FilePath "$DeployPath\monitor-service.bat" -Encoding ASCII
        
        # Log cleanup script
        $cleanupScript = @"
@echo off
forfiles /p "$DeployPath" /s /m *.log /d -7 /c "cmd /c del @path"
echo Log cleanup completed
"@
        $cleanupScript | Out-File -FilePath "$DeployPath\cleanup-logs.bat" -Encoding ASCII
        
        # Backup script
        $backupScript = @"
@echo off
set backup_dir=C:\Backups\Rydora\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
if not exist "%backup_dir%" mkdir "%backup_dir%"
xcopy /E /I /Y "$DeployPath" "%backup_dir%"
echo Backup completed to %backup_dir%
"@
        $backupScript | Out-File -FilePath "$DeployPath\backup-app.bat" -Encoding ASCII
        
        Write-Log "Monitoring scripts created successfully" "SUCCESS"
    }
    catch {
        Write-Log "Failed to create monitoring scripts: $($_.Exception.Message)" "WARNING"
    }
}

# Cleanup function
function Invoke-Cleanup {
    Write-Log "Cleaning up build artifacts..."
    
    try {
        if (Test-Path "client\node_modules") {
            Remove-Item -Path "client\node_modules" -Recurse -Force
        }
        if (Test-Path "client\build") {
            Remove-Item -Path "client\build" -Recurse -Force
        }
        
        Write-Log "Cleanup completed" "SUCCESS"
    }
    catch {
        Write-Log "Cleanup failed: $($_.Exception.Message)" "WARNING"
    }
}

# Main deployment function
function Start-Deployment {
    Write-Log "Starting Rydora Windows deployment..." "SUCCESS"
    
    if (!(Test-Administrator)) {
        Handle-Error "This script must be run as Administrator"
    }
    
    Install-NodeJS
    Install-Dependencies
    Build-Application
    Prepare-ServerFiles
    Install-ServerDependencies
    Create-WindowsService
    Configure-IIS
    Configure-Firewall
    Deploy-Application
    Test-Health
    Create-MonitoringScripts
    Invoke-Cleanup
    
    Write-Log "âœ… Deployment completed successfully!" "SUCCESS"
    Write-Log "ðŸŒ Application is running at http://$([System.Net.Dns]::GetHostByName($env:COMPUTERNAME).AddressList[0])/" "SUCCESS"
    Write-Log "ðŸ“Š Service status: Get-Service '$ServiceName'" "SUCCESS"
    Write-Log "ðŸ“ Logs: Check Windows Event Viewer or $LogPath" "SUCCESS"
    Write-Log "ðŸ”§ Management: Use Services.msc or Get-Service command" "SUCCESS"
}

# Handle script arguments
switch ($Action.ToLower()) {
    "deploy" {
        Start-Deployment
    }
    "restart" {
        Write-Log "Restarting service..."
        Restart-Service -Name $ServiceName -Force
        Test-Health
    }
    "stop" {
        Write-Log "Stopping service..."
        Stop-Service -Name $ServiceName -Force
    }
    "start" {
        Write-Log "Starting service..."
        Start-Service -Name $ServiceName
        Test-Health
    }
    "status" {
        Get-Service -Name $ServiceName
    }
    "logs" {
        Get-EventLog -LogName Application -Source "Rydora*" -Newest 20
    }
    default {
        Write-Host "Usage: .\deploy-windows.ps1 [-Action {deploy|restart|stop|start|status|logs}] [-DeployPath <path>] [-NodeVersion <version>] [-Port <port>]"
        Write-Host "  deploy  - Full deployment (default)"
        Write-Host "  restart - Restart the service"
        Write-Host "  stop    - Stop the service"
        Write-Host "  start   - Start the service"
        Write-Host "  status  - Show service status"
        Write-Host "  logs    - Show service logs"
        exit 1
    }
}

