@echo off
title Cyber Trainer - Seed Database
echo ===================================================
echo       SEEDING CYBER TRAINER PLATFORM
echo ===================================================
echo.
echo Наполнение базы данных тестовыми данными...
cd backend
if not exist "venv" (
    echo Сначала запустите run.bat для инициализации проекта!
    pause
    exit /b 1
)
call venv\Scripts\activate.bat
python seed_db.py
echo.
echo Готово!
pause
