Write-Host "Setting up Rydora React & Node.js Application..." -ForegroundColor Green
Write-Host ""

Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing root dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing client dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "Copying environment files..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item "env.example" ".env"
    Write-Host "Created .env file from template" -ForegroundColor Green
}

if (!(Test-Path "client\.env.local")) {
    Copy-Item "client\env.local" "client\.env.local"
    Write-Host "Created client/.env.local file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start development:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To build for production:" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"

