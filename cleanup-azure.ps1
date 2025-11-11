# Azure Cleanup Script
Write-Host "ðŸ§¹ Cleaning up Azure services..." -ForegroundColor Green

# Login to Azure (if not already logged in)
# az login

# Stop the web app
Write-Host "â¹ï¸ Stopping web app..." -ForegroundColor Yellow
az webapp stop --name RYDORA-web-us-2025 --resource-group RYDORA_web

# Wait a moment
Start-Sleep -Seconds 10

# Remove conflicting settings
Write-Host "ðŸ—‘ï¸ Removing conflicting settings..." -ForegroundColor Yellow
az webapp config appsettings delete --name RYDORA-web-us-2025 --resource-group RYDORA_web --setting-names WEBSITE_RUN_FROM_PACKAGE --output none
az webapp config appsettings delete --name RYDORA-web-us-2025 --resource-group RYDORA_web --setting-names SCM_DO_BUILD_DURING_DEPLOYMENT --output none

# Check for ongoing deployments and wait
Write-Host "â³ Checking for ongoing deployments..." -ForegroundColor Yellow
$deployments = az webapp deployment list --name RYDORA-web-us-2025 --resource-group RYDORA_web --query "[?status=='Running'].id" --output tsv
if ($deployments) {
    Write-Host "Found running deployments, waiting..." -ForegroundColor Red
    Start-Sleep -Seconds 30
}

# Restart the web app
Write-Host "â–¶ï¸ Starting web app..." -ForegroundColor Yellow
az webapp start --name RYDORA-web-us-2025 --resource-group RYDORA_web

# Check final status
Write-Host "âœ… Final status check..." -ForegroundColor Green
az webapp show --name RYDORA-web-us-2025 --resource-group RYDORA_web --query "{name:name, state:state, kind:kind}" --output table

Write-Host "ðŸŽ‰ Cleanup completed! You can now redeploy." -ForegroundColor Green

