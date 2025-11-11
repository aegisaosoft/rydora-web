@echo off
echo Copying RYDORAApi DLLs to RYDORAUS.Web\bin\Debug\net8.0...

if not exist "RYDORAUS.Web\bin\Debug\net8.0" (
    echo Creating directory RYDORAUS.Web\bin\Debug\net8.0
    mkdir "RYDORAUS.Web\bin\Debug\net8.0"
)

copy "libs\*.dll" "RYDORAUS.Web\bin\Debug\net8.0\"
copy "libs\*.xml" "RYDORAUS.Web\bin\Debug\net8.0\"
copy "libs\*.deps.json" "RYDORAUS.Web\bin\Debug\net8.0\"

echo.
echo DLLs copied successfully!
echo.
echo Files copied:
dir "RYDORAUS.Web\bin\Debug\net8.0\RYDORAApi*"
echo.
pause

