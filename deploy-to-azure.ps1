# Azure Web App Deployment Script
# This script deploys your React + Node.js app directly to Azure Web App

param(
    [string]$ResourceGroup = "rydora-rg",
    [string]$AppName = "rydora-app",
    [string]$PlanName = "rydora-plan",
    [string]$Location = "East US"
)

Write-Host "ðŸš€ Starting Azure Web App Deployment..." -ForegroundColor Green

# Check if Azure CLI is installed
try {
    $azVersion = az --version
    Write-Host "âœ… Azure CLI found: $($azVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "âŒ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Login to Azure
Write-Host "ðŸ” Logging into Azure..." -ForegroundColor Yellow
az login

# Create resource group
Write-Host "ðŸ“ Creating resource group: $ResourceGroup" -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location

# Create App Service Plan
Write-Host "ðŸ“‹ Creating App Service Plan: $PlanName" -ForegroundColor Yellow
az appservice plan create `
    --name $PlanName `
    --resource-group $ResourceGroup `
    --sku B1 `
    --is-linux false

# Create Web App
Write-Host "ðŸŒ Creating Web App: $AppName" -ForegroundColor Yellow
az webapp create `
    --resource-group $ResourceGroup `
    --plan $PlanName `
    --name $AppName `
    --runtime "NODE:18-lts"

# Configure application settings
Write-Host "âš™ï¸ Configuring application settings..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings `
        NODE_ENV=production `
        PORT=8080 `
        WEBSITE_NODE_DEFAULT_VERSION=18.18.0 `
        SCM_DO_BUILD_DURING_DEPLOYMENT=true `
        WEBSITE_RUN_FROM_PACKAGE=0

# Get deployment URL
Write-Host "ðŸ”— Getting deployment URL..." -ForegroundColor Yellow
$deploymentUrl = az webapp deployment source config-local-git `
    --name $AppName `
    --resource-group $ResourceGroup `
    --query "url" `
    --output tsv

Write-Host "âœ… Azure Web App created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "ðŸ“‹ Next Steps:" -ForegroundColor Cyan
Write-Host "1. Initialize git repository (if not already done):" -ForegroundColor White
Write-Host "   git init" -ForegroundColor Gray
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Initial commit for Azure deployment'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Add Azure remote:" -ForegroundColor White
Write-Host "   git remote add azure $deploymentUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy your application:" -ForegroundColor White
Write-Host "   git push azure main" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Your app will be available at:" -ForegroundColor White
Write-Host "   https://$AppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host ""
Write-Host "ðŸ” To monitor your deployment:" -ForegroundColor Yellow
Write-Host "   az webapp log tail --name $AppName --resource-group $ResourceGroup" -ForegroundColor Gray

