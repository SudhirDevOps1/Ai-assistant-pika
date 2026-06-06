@echo off
echo Starting Voice AI Servers...
echo.

:: Start PC Bridge WebSocket server in a new window
echo Starting PC Bridge...
start "Voice AI - PC Bridge" cmd /c "cd pc-bridge && python pc_bridge.py"

:: Start Next.js Development Server in this window
echo Starting Web UI...
npm run dev
