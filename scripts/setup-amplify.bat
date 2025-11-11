@echo off
REM Rydora AWS Amplify Setup Script for Windows
REM This script sets up the initial AWS Amplify project configuration

setlocal enabledelayedexpansion

REM Configuration
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1
set PROJECT_NAME=rydora
set ENVIRONMENT=prod

echo [INFO] Starting AWS Amplify setup for Rydora...

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

REM Create Amplify app
echo [INFO] Creating AWS Amplify app...

for /f "tokens=*" %%i in ('aws amplify create-app --name "%PROJECT_NAME%" --description "Rydora Toll Management Platform" --platform "WEB" --repository "https://github.com/your-org/rydora-react" --region %AWS_REGION% --query "app.appId" --output text') do set APP_ID=%%i

if "%APP_ID%"=="" (
    echo [ERROR] Failed to create Amplify app
    exit /b 1
)

echo [SUCCESS] Amplify app created with ID: %APP_ID%

REM Create environment file
echo AMPLIFY_APP_ID=%APP_ID% > .env.amplify
echo export AMPLIFY_APP_ID=%APP_ID% >> .env.amplify

REM Create Amplify branch
echo [INFO] Creating Amplify branch: main...

aws amplify create-branch --app-id %APP_ID% --branch-name "main" --description "Main production branch" --region %AWS_REGION%
if errorlevel 1 (
    echo [ERROR] Failed to create Amplify branch
    exit /b 1
)

echo [SUCCESS] Amplify branch 'main' created successfully!

REM Configure build settings
echo [INFO] Configuring build settings...

aws amplify update-app --app-id %APP_ID% --region %AWS_REGION% --build-spec "version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo Installing dependencies...
        - cd client
        - npm ci
    build:
      commands:
        - echo Building React application...
        - npm run build
        - echo Build completed successfully
  artifacts:
    baseDirectory: client/build
    files:
      - '**/*'
  cache:
    paths:
      - client/node_modules/**/*
      - node_modules/**/*"
if errorlevel 1 (
    echo [WARNING] Failed to configure build settings
)

echo [SUCCESS] Build settings configured successfully!

REM Set up custom domain (optional)
set /p SETUP_DOMAIN="Do you want to set up a custom domain? (y/n): "
if /i "%SETUP_DOMAIN%"=="y" (
    set /p CUSTOM_DOMAIN="Enter your custom domain (e.g., rydora.com): "
    
    if not "%CUSTOM_DOMAIN%"=="" (
        echo [INFO] Setting up custom domain: %CUSTOM_DOMAIN%
        
        aws amplify create-domain-association --app-id %APP_ID% --domain-name %CUSTOM_DOMAIN% --region %AWS_REGION% --sub-domain-settings branchName=main,prefix=www --sub-domain-settings branchName=main,prefix=""
        if errorlevel 1 (
            echo [WARNING] Failed to configure custom domain
        ) else (
            echo [SUCCESS] Custom domain configured: %CUSTOM_DOMAIN%
            echo [WARNING] Note: You'll need to update your DNS records as shown in the Amplify Console
        )
    )
)

REM Create environment file
echo [INFO] Creating environment configuration file...

(
echo # AWS Amplify Configuration
echo AMPLIFY_APP_ID=%APP_ID%
echo AMPLIFY_BRANCH=main
echo AMPLIFY_ENV=%ENVIRONMENT%
echo AWS_REGION=%AWS_REGION%
echo.
echo # Build Configuration
echo NODE_ENV=production
echo REACT_APP_ENV=production
echo.
echo # API Configuration (update these with your actual values)
echo REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
echo REACT_APP_GRAPHQL_URL=https://your-appsync-url.appsync-api.%AWS_REGION%.amazonaws.com/graphql
echo REACT_APP_GRAPHQL_API_KEY=your-appsync-api-key
echo.
echo # Authentication (if using Cognito)
echo REACT_APP_USER_POOL_ID=your-user-pool-id
echo REACT_APP_USER_POOL_WEB_CLIENT_ID=your-user-pool-client-id
echo REACT_APP_IDENTITY_POOL_ID=your-identity-pool-id
echo.
echo # Storage (if using S3)
echo REACT_APP_S3_BUCKET=your-s3-bucket-name
echo REACT_APP_S3_REGION=%AWS_REGION%
) > .env.amplify

echo [SUCCESS] Environment file created: .env.amplify

REM Create deployment configuration
echo [INFO] Creating deployment configuration...

REM Create amplify.yml if it doesn't exist
if not exist "amplify.yml" (
    (
    echo version: 1
    echo frontend:
    echo   phases:
    echo     preBuild:
    echo       commands:
    echo         - echo "Installing dependencies..."
    echo         - cd client
    echo         - npm ci
    echo     build:
    echo       commands:
    echo         - echo "Building React application..."
    echo         - npm run build
    echo         - echo "Build completed successfully"
    echo   artifacts:
    echo     baseDirectory: client/build
    echo     files:
    echo       - '**/*'
    echo   cache:
    echo     paths:
    echo       - client/node_modules/**/*
    echo       - node_modules/**/*
    ) > amplify.yml
    echo [SUCCESS] amplify.yml created
)

REM Create .amplifyrc if it doesn't exist
if not exist ".amplifyrc" (
    (
    echo {
    echo   "projectPath": ".",
    echo   "defaultEditor": "code",
    echo   "envName": "%ENVIRONMENT%"
    echo }
    ) > .amplifyrc
    echo [SUCCESS] .amplifyrc created
)

REM Display setup summary
echo.
echo [SUCCESS] ðŸŽ‰ AWS Amplify setup completed successfully!
echo.
echo Setup Summary:
echo ==============
echo App ID: %APP_ID%
echo Region: %AWS_REGION%
echo Branch: main
echo Environment: %ENVIRONMENT%
echo.
echo Next Steps:
echo ===========
echo 1. Source the environment file: call .env.amplify
echo 2. Run the deployment script: scripts\deploy-amplify.bat
echo 3. Check the AWS Amplify Console for your app
echo 4. Update the environment variables in .env.amplify with your actual values
echo.
echo Useful Commands:
echo ================
echo â€¢ View app: aws amplify get-app --app-id %APP_ID% --region %AWS_REGION%
echo â€¢ List branches: aws amplify list-branches --app-id %APP_ID% --region %AWS_REGION%
echo â€¢ View jobs: aws amplify list-jobs --app-id %APP_ID% --branch-name main --region %AWS_REGION%
echo.

endlocal

