@echo off
title Cyber Trainer Launcher

echo ===================================================
echo       STARTING CYBER TRAINER PLATFORM
echo ===================================================
echo.

:: 1. Frontend Setup & Build
echo [1/3] Building Frontend (React/Vite)...
cd frontend
if not exist "node_modules" (
    echo Installing Frontend dependencies...
    call npm install
)
call npm run build
cd ..

:: 2. Backend Setup
echo [2/3] Checking Backend (FastAPI)...
cd backend
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing Python dependencies...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
    echo Checking Python dependencies...
    pip install -r requirements.txt
)
echo Updating database schema...
python create_tables.py
alembic upgrade head
cd ..

:: 3. Open Browser
echo [3/3] Opening browser...
:: Wait slightly for backend to start below
timeout /t 3 /nobreak >nul
start http://localhost:8000

:: 4. Start Backend
echo.
echo ===================================================
echo Backend is starting on port 8000. 
echo You can minimize this window.
echo Press Ctrl+C to stop the server.
echo ===================================================
cd backend
call venv\Scripts\activate.bat
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

:: If uvicorn crashes, keep the window open
echo.
echo Server encountered an error!
pause
