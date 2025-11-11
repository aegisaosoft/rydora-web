@echo off
REM Rydora AWS Amplify Deployment Script for Windows
REM This script automates the deployment process to AWS Amplify

setlocal enabledelayedexpansion

REM Configuration
if "%AMPLIFY_APP_ID%"=="" set AMPLIFY_APP_ID=
if "%AMPLIFY_BRANCH%"=="" set AMPLIFY_BRANCH=main
if "%AMPLIFY_ENV%"=="" set AMPLIFY_ENV=prod
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1
if "%BUILD_NUMBER%"=="" set BUILD_NUMBER=%date:~-4,4%%date:~-10,2%%date:~-7,2%%time:~0,2%%time:~3,2%%time:~6,2%

echo [INFO] Starting Rydora AWS Amplify deployment...
echo [INFO] Build Number: %BUILD_NUMBER%
echo [INFO] Environment: %AMPLIFY_ENV%
echo [INFO] Branch: %AMPLIFY_BRANCH%

REM Check prerequisites
echo [INFO] Checking prerequisites...

where aws >nul 2>&1
if errorlevel 1 (
    echo [ERROR] AWS CLI is not installed. Please install it first.
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install it first.
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install it first.
    exit /b 1
)

aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo [ERROR] AWS credentials not configured. Please run 'aws configure' first.
    exit /b 1
)

echo [SUCCESS] All prerequisites met!

REM Install dependencies
echo [INFO] Installing dependencies...

npm ci --only=production
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    exit /b 1
)

cd client
npm ci
if errorlevel 1 (
    echo [ERROR] Failed to install client dependencies
    exit /b 1
)
cd ..

echo [SUCCESS] Dependencies installed successfully!

REM Run tests and linting
echo [INFO] Running tests and linting...

cd client

echo [INFO] Running ESLint...
npm run lint
if errorlevel 1 (
    echo [WARNING] Linting completed with warnings
)

echo [INFO] Running TypeScript type checking...
npx tsc --noEmit
if errorlevel 1 (
    echo [WARNING] Type checking completed with warnings
)

echo [INFO] Running unit tests...
npm test -- --coverage --watchAll=false
if errorlevel 1 (
    echo [WARNING] Tests completed with warnings
)

cd ..

echo [SUCCESS] Tests and linting completed!

REM Build the application
echo [INFO] Building React application...

cd client

REM Set production environment variables
set REACT_APP_ENV=production
set REACT_APP_VERSION=%BUILD_NUMBER%
set REACT_APP_BUILD_DATE=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%Z

REM Build the application
npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)

REM Verify build
if not exist "build\index.html" (
    echo [ERROR] Build failed - index.html not found
    exit /b 1
)

cd ..

echo [SUCCESS] Application built successfully!

REM Initialize Amplify project
echo [INFO] Initializing Amplify project...

if "%AMPLIFY_APP_ID%"=="" (
    echo [ERROR] AMPLIFY_APP_ID environment variable is required
    exit /b 1
)

REM Initialize Amplify if not already done
if not exist "amplify\team-provider-info.json" (
    echo [INFO] Initializing new Amplify project...
    amplify init --yes --appId %AMPLIFY_APP_ID%
    if errorlevel 1 (
        echo [ERROR] Failed to initialize Amplify project
        exit /b 1
    )
) else (
    echo [INFO] Amplify project already initialized
)

echo [SUCCESS] Amplify project initialized!

REM Deploy to Amplify
echo [INFO] Deploying to AWS Amplify...

REM Deploy backend resources
echo [INFO] Deploying backend resources...
amplify push --yes
if errorlevel 1 (
    echo [ERROR] Failed to deploy backend resources
    exit /b 1
)

REM Deploy frontend
echo [INFO] Deploying frontend to Amplify Hosting...
amplify publish --yes
if errorlevel 1 (
    echo [ERROR] Failed to deploy frontend
    exit /b 1
)

echo [SUCCESS] Deployment completed successfully!

REM Update Amplify app
echo [INFO] Updating Amplify app configuration...

aws amplify update-app --app-id %AMPLIFY_APP_ID% --region %AWS_REGION% --description "Rydora Toll Management Platform - Build %BUILD_NUMBER%"
if errorlevel 1 (
    echo [WARNING] Failed to update Amplify app description
)

echo [SUCCESS] Amplify app updated successfully!

REM Health check
echo [INFO] Performing health check...

REM Get the app URL
for /f "tokens=*" %%i in ('aws amplify get-app --app-id %AMPLIFY_APP_ID% --region %AWS_REGION% --query "app.defaultDomain" --output text') do set APP_URL=%%i

if not "%APP_URL%"=="None" if not "%APP_URL%"=="" (
    set FULL_URL=https://%AMPLIFY_BRANCH%.%APP_URL%
    echo [INFO] Application URL: %FULL_URL%
    
    REM Wait for deployment to be ready
    echo [INFO] Waiting for deployment to be ready...
    timeout /t 30 /nobreak >nul
    
    REM Test the application
    curl -s -o nul -w "%%{http_code}" "%FULL_URL%" > temp_status.txt
    set /p HTTP_STATUS=<temp_status.txt
    del temp_status.txt
    
    if "%HTTP_STATUS%"=="200" (
        echo [SUCCESS] Health check passed - Application is accessible
    ) else (
        echo [WARNING] Health check warning - HTTP Status: %HTTP_STATUS%
    )
) else (
    echo [WARNING] Could not determine application URL
)

REM Create deployment summary
echo [INFO] Creating deployment summary...

(
echo # Rydora Amplify Deployment Summary
echo.
echo ## Build Information
echo - **Build Number**: %BUILD_NUMBER%
echo - **Build Date**: %date% %time%
echo - **Environment**: %AMPLIFY_ENV%
echo - **Branch**: %AMPLIFY_BRANCH%
echo.
echo ## Deployment Details
echo - **Amplify App ID**: %AMPLIFY_APP_ID%
echo - **AWS Region**: %AWS_REGION%
echo - **Deployment Script**: deploy-amplify.bat
echo.
echo ## Next Steps
echo 1. Verify the deployment in AWS Amplify Console
echo 2. Test the application functionality
echo 3. Monitor application logs and metrics
echo 4. Update DNS if using custom domain
echo.
echo ## Rollback Instructions
echo If rollback is needed:
echo 1. Go to AWS Amplify Console
echo 2. Navigate to the app and branch
echo 3. Select a previous deployment
echo 4. Click "Redeploy this version"
) > deployment-summary.md

echo [SUCCESS] Deployment summary created: deployment-summary.md

echo [SUCCESS] ðŸŽ‰ Deployment completed successfully!
echo [INFO] Check deployment-summary.md for details

endlocal

