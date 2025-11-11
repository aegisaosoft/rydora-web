@echo off
REM Rydora Production Build Script for Windows
REM This script builds the production application for Azure deployment

setlocal enabledelayedexpansion

REM Configuration
set IMAGE_NAME=rydora
set IMAGE_TAG=production

echo === Rydora Production Build Script ===
echo Building application for Azure Web App deployment

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js and try again.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm ci
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Build React client
echo Building React client...
cd client
call npm ci
call npm run build
cd ..
if errorlevel 1 (
    echo Error: Failed to build React client
    pause
    exit /b 1
)

REM Create deployment package
echo Creating deployment package...
if exist deploy-package rmdir /s /q deploy-package
mkdir deploy-package
xcopy /e /i server deploy-package\server
xcopy /e /i client\build deploy-package\client\build
copy package.json deploy-package\
copy web.config deploy-package\

REM Install production dependencies in deployment package
echo Installing production dependencies...
cd deploy-package
call npm ci --only=production
cd ..

REM Create zip file for deployment
echo Creating deployment zip file...
cd deploy-package
powershell Compress-Archive -Path * -DestinationPath ..\rydora-deployment.zip -Force
cd ..

if errorlevel 1 (
    echo Error: Failed to create deployment package
    pause
    exit /b 1
)

echo âœ“ Deployment package created successfully!

REM Show package details
for %%A in (rydora-deployment.zip) do set PACKAGE_SIZE=%%~zA
echo Package size: %PACKAGE_SIZE% bytes

echo === Build completed successfully! ===
echo Next steps:
echo 1. Deploy to Azure Web App using GitHub Actions
echo 2. Or use Azure CLI: az webapp deploy --name RYDORA-web-us-2025 --resource-group RYDORA_web --src-path rydora-deployment.zip --type zip
echo 3. Check deployment status in Azure Portal

REM Clean up
rmdir /s /q deploy-package

pause
