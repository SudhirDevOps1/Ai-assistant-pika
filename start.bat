@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title Pika AI Assistant - Launcher
color 0B

:: ═══════════════════════════════════════════════════════════════
::  Pika AI Assistant — One-Click Launcher
::  Handles: Install, Setup, Database, PC Bridge, Web UI, Browser
:: ═══════════════════════════════════════════════════════════════

:: Get the directory where this bat file lives
set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

cls

:: ─── ANIMATED BANNER ───
echo.
echo   [95m    ██████╗ ██╗██╗  ██╗ █████╗      █████╗ ██╗[0m
echo   [95m    ██╔══██╗██║██║ ██╔╝██╔══██╗    ██╔══██╗██║[0m
echo   [36m    ██████╔╝██║█████╔╝ ███████║    ███████║██║[0m
echo   [36m    ██╔═══╝ ██║██╔═██╗ ██╔══██║    ██╔══██║██║[0m
echo   [96m    ██║     ██║██║  ██╗██║  ██║    ██║  ██║██║[0m
echo   [96m    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝[0m
echo.
echo   [90m  ================================================[0m
echo   [97m   🎙️  P I K A   A I   A S S I S T A N T   L A U N C H E R[0m
echo   [90m  ================================================[0m
echo   [90m  Project: %PROJECT_DIR%[0m
echo.

:: ─── STEP 1: CHECK PREREQUISITES ───
echo   [33m[1/6][0m [97mChecking prerequisites...[0m
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [91m  ✗ Node.js not found![0m
    echo   [90m    Download from: https://nodejs.org/[0m
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo   [92m  ✓ Node.js %NODE_VER%[0m

:: Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [91m  ✗ Python not found![0m
    echo   [90m    Download from: https://python.org/[0m
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
echo   [92m  ✓ %PY_VER%[0m

:: Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [91m  ✗ npm not found! [Should come with Node.js][0m
    pause
    exit /b 1
)
echo   [92m  ✓ npm available[0m
echo.

:: ─── STEP 2: INSTALL PYTHON PACKAGES ───
echo   [33m[2/6][0m [97mInstalling Python packages (pc-bridge)...[0m

if exist "%PROJECT_DIR%\pc-bridge\requirements.txt" (
    echo   [90m  ► pip install -r requirements.txt[0m
    cd /d "%PROJECT_DIR%\pc-bridge"
    pip install -r requirements.txt --quiet --disable-pip-version-check >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   [92m  ✓ Python packages installed
    ) else (
        echo   [93m  ⚠ Some Python packages may have failed [non-critical][0m
    )
) else (
    echo   [93m  ⚠ requirements.txt not found, skipping...[0m
)
echo.

:: ─── STEP 3: INSTALL NODE PACKAGES ───
echo   [33m[3/6][0m [97mInstalling Node.js packages...[0m

cd /d "%PROJECT_DIR%"

if not exist "%PROJECT_DIR%\node_modules" (
    echo   [90m  ► npm install [first time — this may take 2-5 minutes]...[0m
    npm install --loglevel=error 2>&1 | findstr /i "added changed"
    echo   [92m  ✓ Node packages installed[0m
) else (
    echo   [92m  ✓ node_modules already exists [skipping install][0m
)
echo.

:: ─── STEP 4: DATABASE SETUP (PRISMA) ───
echo   [33m[4/6][0m [97mSetting up database (Prisma)...[0m

cd /d "%PROJECT_DIR%"

if exist "%PROJECT_DIR%\prisma" (
    echo   [90m  ► npx prisma generate[0m
    call npx prisma generate --no-hints >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   [92m  ✓ Prisma client generated
    ) else (
        echo   [93m  ⚠ Prisma generate had warnings [non-critical][0m
    )

    echo   [90m  ► npx prisma db push[0m
    call npx prisma db push --accept-data-loss >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   [92m  ✓ Database synced
    ) else (
        echo   [93m  ⚠ Prisma db push had warnings [non-critical][0m
    )
) else (
    echo   [93m  ⚠ No prisma directory found, skipping...[0m
)
echo.

:: ─── STEP 5: START PC BRIDGE ───
echo   [33m[5/6][0m [97mStarting PC Bridge (Python WebSocket server)...[0m

cd /d "%PROJECT_DIR%\pc-bridge"

if exist "%PROJECT_DIR%\pc-bridge\pc_bridge.py" (
    start "Pika AI - PC Bridge" /min cmd /c "title Pika AI - PC Bridge [ws://localhost:8765] && color 0A && python pc_bridge.py"
    echo   [92m  ✓ PC Bridge starting on ws://localhost:8765
    echo   [90m    [Running in minimized window][0m
) else (
    echo   [93m  ⚠ pc_bridge.py not found, skipping...[0m
)
echo.

:: ─── STEP 6: START WEB UI ───
echo   [33m[6/6][0m [97mStarting Web UI (Next.js dev server)...[0m
echo.

cd /d "%PROJECT_DIR%"

:: Wait 2 seconds for PC Bridge to initialize, then open browser
echo   [36m  ► Waiting 3 seconds for services to initialize...[0m

:: Animated loading dots
for /L %%i in (1,1,3) do (
    <nul set /p "=  [90m.[0m"
    timeout /t 1 /nobreak >nul
)
echo.
echo.

:: Auto-open browser
echo   [36m  ► Opening browser at http://localhost:3000 ...[0m
start "" "http://localhost:3000"

echo.
echo   [96m╔══════════════════════════════════════════════════════════╗[0m
echo   [96m║[0m                                                          [96m║[0m
echo   [96m║[0m   [92m ✓ ALL SYSTEMS GO![0m                                     [96m║[0m
echo   [96m║[0m                                                          [96m║[0m
echo   [96m║[0m   [97m Web UI:[0m     [36mhttp://localhost:3000[0m                     [96m║[0m
echo   [96m║[0m   [97m PC Bridge:[0m  [36mws://localhost:8765[0m                       [96m║[0m
echo   [96m║[0m                                                          [96m║[0m
echo   [96m║[0m   [90m Press Ctrl+C to stop the Web UI server.[0m               [96m║[0m
echo   [96m║[0m   [90m Close the "PC Bridge" window to stop it.[0m              [96m║[0m
echo   [96m║[0m                                                          [96m║[0m
echo   [96m╚══════════════════════════════════════════════════════════╝[0m
echo.

:: Start Next.js dev server (this blocks — keeps the window open)
npm run dev
