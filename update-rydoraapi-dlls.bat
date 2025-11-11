@echo off
echo Updating RYDORAApi DLLs from RYDORA-api repository...
echo.

powershell -ExecutionPolicy Bypass -File "update-RYDORAapi-dlls.ps1"

echo.
echo Update complete!
pause

