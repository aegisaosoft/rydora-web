@echo off
REM Rydora Application Restart Script for Windows
REM This script restarts the Rydora application with proper service management

setlocal enabledelayedexpansion

REM Configuration
if "%SERVICE_NAME%"=="" set SERVICE_NAME=Rydora Application
if "%APP_PORT%"=="" set APP_PORT=5000
if "%DEPLOY_DIR%"=="" set DEPLOY_DIR=C:\inetpub\wwwroot\rydora
if "%SERVER_DIR%"=="" set SERVER_DIR=%DEPLOY_DIR%\server

echo [INFO] Starting Rydora application restart process...
echo [INFO] Service: %SERVICE_NAME%
echo [INFO] Port: %APP_PORT%
echo [INFO] Deploy Directory: %DEPLOY_DIR%

REM Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This script must be run as administrator
    exit /b 1
)

REM Stop the application
echo [INFO] ðŸ›‘ Stopping Rydora application...

sc query "%SERVICE_NAME%" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Service %SERVICE_NAME% exists, checking status...
    sc query "%SERVICE_NAME%" | find "RUNNING" >nul
    if not errorlevel 1 (
        echo [INFO] Service %SERVICE_NAME% is running, stopping...
        sc stop "%SERVICE_NAME%"
        timeout /t 10 /nobreak >nul
        
        REM Check if service is stopped
        sc query "%SERVICE_NAME%" | find "STOPPED" >nul
        if not errorlevel 1 (
            echo [SUCCESS] Service %SERVICE_NAME% stopped successfully
        ) else (
            echo [WARNING] Service may still be running, force stopping...
            taskkill /f /im node.exe >nul 2>&1
        )
    ) else (
        echo [INFO] Service %SERVICE_NAME% is not running
    )
) else (
    echo [INFO] Service %SERVICE_NAME% does not exist
)

REM Kill any remaining Node.js processes on the app port
for /f "tokens=5" %%a in ('netstat -ano ^| find ":%APP_PORT% "') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [SUCCESS] Application stopped successfully

REM Start the application
echo [INFO] ðŸ”„ Starting Rydora application...

REM Check if service exists
sc query "%SERVICE_NAME%" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Service does not exist, creating Windows service...
    call :create_windows_service
)

REM Start the service
sc start "%SERVICE_NAME%"
if errorlevel 1 (
    echo [ERROR] Failed to start service %SERVICE_NAME%
    sc query "%SERVICE_NAME%"
    exit /b 1
)

REM Wait for service to start
echo [INFO] Waiting for service to start...
timeout /t 15 /nobreak >nul

REM Check service status
sc query "%SERVICE_NAME%" | find "RUNNING" >nul
if not errorlevel 1 (
    echo [SUCCESS] Service %SERVICE_NAME% started successfully
) else (
    echo [ERROR] Failed to start service %SERVICE_NAME%
    sc query "%SERVICE_NAME%"
    exit /b 1
)

REM Health check
echo [INFO] ðŸ” Performing health check...
echo [INFO] Waiting for application to be ready...

for /L %%i in (1,1,30) do (
    curl -f http://localhost:%APP_PORT%/health >nul 2>&1
    if not errorlevel 1 (
        echo [SUCCESS] Application is healthy and responding
        goto :health_ok
    )
    echo [INFO] Attempt %%i/30: Application not ready yet...
    timeout /t 2 /nobreak >nul
)

:health_ok

REM Final health check
curl -f http://localhost:%APP_PORT%/health >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Application health check passed
) else (
    echo [WARNING] Application health check failed, but service is running
)

REM Verify deployment
echo [INFO] ðŸ” Verifying deployment...

REM Check service status
echo [INFO] Service status:
sc query "%SERVICE_NAME%"

REM Check if port is listening
netstat -an | find ":%APP_PORT% " >nul
if not errorlevel 1 (
    echo [SUCCESS] Application is listening on port %APP_PORT%
) else (
    echo [ERROR] Application is not listening on port %APP_PORT%
)

REM Test application endpoints
echo [INFO] Testing application endpoints...

REM Health endpoint
curl -f http://localhost:%APP_PORT%/health >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Health endpoint responding
) else (
    echo [ERROR] Health endpoint not responding
)

REM Main application
curl -f http://localhost:%APP_PORT%/ >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Main application responding
) else (
    echo [ERROR] Main application not responding
)

REM Show management commands
echo.
echo [INFO] Service Management Commands:
echo ==============================
echo â€¢ Check status: sc query "%SERVICE_NAME%"
echo â€¢ Start service: sc start "%SERVICE_NAME%"
echo â€¢ Stop service: sc stop "%SERVICE_NAME%"
echo â€¢ Restart service: sc stop "%SERVICE_NAME%" ^&^& sc start "%SERVICE_NAME%"
echo â€¢ Delete service: sc delete "%SERVICE_NAME%"
echo.
echo Application URL: http://your-server-ip:%APP_PORT%
echo Health Check: http://your-server-ip:%APP_PORT%/health
echo.

echo [SUCCESS] ðŸŽ‰ Application restart completed successfully!

goto :eof

REM Function to create Windows service
:create_windows_service
echo [INFO] Creating Windows service...

REM Install node-windows if not present
npm install -g node-windows >nul 2>&1

REM Create service installation script
echo var Service = require('node-windows').Service; > "%SERVER_DIR%\install-service.js"
echo. >> "%SERVER_DIR%\install-service.js"
echo var svc = new Service({ >> "%SERVER_DIR%\install-service.js"
echo   name:'%SERVICE_NAME%', >> "%SERVER_DIR%\install-service.js"
echo   description: 'Rydora Toll Management Platform', >> "%SERVER_DIR%\install-service.js"
echo   script: '%SERVER_DIR%\index.js', >> "%SERVER_DIR%\install-service.js"
echo   nodeOptions: [ >> "%SERVER_DIR%\install-service.js"
echo     '--max_old_space_size=4096' >> "%SERVER_DIR%\install-service.js"
echo   ], >> "%SERVER_DIR%\install-service.js"
echo   env: [ >> "%SERVER_DIR%\install-service.js"
echo     { name: "NODE_ENV", value: "production" }, >> "%SERVER_DIR%\install-service.js"
echo     { name: "PORT", value: "%APP_PORT%" } >> "%SERVER_DIR%\install-service.js"
echo   ] >> "%SERVER_DIR%\install-service.js"
echo }); >> "%SERVER_DIR%\install-service.js"
echo. >> "%SERVER_DIR%\install-service.js"
echo svc.on('install', function(){ >> "%SERVER_DIR%\install-service.js"
echo   svc.start(); >> "%SERVER_DIR%\install-service.js"
echo }); >> "%SERVER_DIR%\install-service.js"
echo. >> "%SERVER_DIR%\install-service.js"
echo svc.install(); >> "%SERVER_DIR%\install-service.js"

REM Install the service
cd /d "%SERVER_DIR%"
node install-service.js

echo [SUCCESS] Windows service created
goto :eof

