@echo off
echo ============================================
echo Healthcare Management System - Frontend
echo ============================================
echo.

cd /d "%~dp0"

echo Starting frontend development server...
echo Backend should be running on http://localhost:5000
echo.

npm run dev

echo.
pause