@echo off
REM Rydora Development Setup Script for Windows
REM This script sets up the development environment

echo === Rydora Development Setup ===
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not available
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

REM Install server dependencies
echo Installing server dependencies...
npm install
if errorlevel 1 (
    echo Error: Failed to install server dependencies
    pause
    exit /b 1
)
echo Server dependencies installed successfully!
echo.

REM Install client dependencies
echo Installing client dependencies...
cd client
npm install
if errorlevel 1 (
    echo Error: Failed to install client dependencies
    pause
    exit /b 1
)
cd ..
echo Client dependencies installed successfully!
echo.

REM Setup environment file
if not exist .env (
    if exist env.example (
        echo Setting up environment file...
        copy env.example .env
        echo Environment file created from template
        echo Please edit .env with your configuration
    ) else (
        echo Warning: No env.example file found
    )
) else (
    echo Environment file already exists
)
echo.

REM Setup client environment file
if not exist client\.env.local (
    echo Setting up client environment file...
    echo REACT_APP_API_URL=http://localhost:5000/api > client\.env.local
    echo REACT_APP_NAME=Rydora >> client\.env.local
    echo REACT_APP_VERSION=1.0.0 >> client\.env.local
    echo Client environment file created
) else (
    echo Client environment file already exists
)
echo.

echo === Setup Complete! ===
echo.
echo Next steps:
echo 1. Edit .env file with your configuration
echo 2. Start development servers:
echo    npm run dev
echo.
echo Available commands:
echo - npm run dev          Start both client and server
echo - npm run server       Start server only (port 5000)
echo - npm run client       Start client only (port 3000)
echo - npm run build        Build client for production
echo.
echo Development URLs:
echo - Client: http://localhost:3000
echo - Server: http://localhost:5000
echo - API:    http://localhost:5000/api
echo - Health: http://localhost:5000/api/health
echo.

pause

