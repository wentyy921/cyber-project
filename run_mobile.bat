@echo off
title Cyber Trainer Mobile

echo ===================================================
echo       STARTING CYBER TRAINER MOBILE APP
echo ===================================================
echo.

echo Checking if backend is running...
netstat -ano | findstr :8000 >nul
if errorlevel 1 goto start_backend
goto start_mobile

:start_backend
echo [INFO] Backend is NOT running. Starting FastAPI backend in the background...
start /b cmd /c "cd backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo Waiting for backend to start (5 seconds)...
timeout /t 5 /nobreak >nul
goto start_mobile

:start_mobile
echo [OK] Backend is ready.
echo.
echo [INFO] Setting up ADB reverse proxy for backend port 8000...
adb reverse tcp:8000 tcp:8000
echo.
echo [INFO] Starting Expo Bundler for Android...
echo ===================================================
echo Logs from BOTH Backend and Expo will appear here!
echo Do not close this window! Expo will automatically
echo open the app on your connected Pixel emulator.
echo ===================================================

cd mobile || goto error_cd
call npm run android
goto end

:error_cd
echo [ERROR] Could not find 'mobile' folder!
pause
exit /b 1

:end
echo.
echo [INFO] Expo process finished.
pause
