@echo off
echo ============================================
echo Healthcare Management System - Status Check
echo ============================================
echo.

echo Checking backend health...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend: RUNNING (http://localhost:5000)
) else (
    echo ❌ Backend: NOT RUNNING
)

echo.
echo Checking frontend dev server...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend: RUNNING (http://localhost:5173)
) else (
    echo ❌ Frontend: NOT RUNNING
)

echo.
echo To start services:
echo - Backend:  Double-click start-backend.bat
echo - Frontend: Double-click start-frontend.bat
echo.
pause