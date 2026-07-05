@echo off
echo ============================================
echo Healthcare Management System - Backend
echo ============================================
echo.

cd /d "%~dp0"

echo Checking MongoDB Atlas connection...
echo If this fails, check your Atlas IP whitelist
echo.

npm start

echo.
echo If connection fails, try:
echo 1. Add 0.0.0.0/0 to Atlas IP whitelist
echo 2. Or start local MongoDB: mongod
echo 3. Or check your internet connection
echo.
pause