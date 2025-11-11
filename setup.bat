@echo off
echo Setting up Rydora React & Node.js Application...
echo.

echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing root dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo Error installing client dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Copying environment files...
if not exist .env (
    copy env.example .env
    echo Created .env file from template
)

if not exist client\.env.local (
    copy client\env.local client\.env.local
    echo Created client/.env.local file
)

echo.
echo Setup complete!
echo.
echo To start development:
echo   npm run dev
echo.
echo To build for production:
echo   npm run build
echo   npm start
echo.
pause

