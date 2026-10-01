@echo off
title Lost&Found AI - Launcher
echo ===================================================
echo           Starting Lost^&Found AI System
echo ===================================================
echo.

echo [1/2] Launching FastAPI Backend (Port 8000)...
start "Lost&Found AI - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo [2/2] Launching Vite Frontend (Port 5173)...
start "Lost&Found AI - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  All services started!
echo  - Frontend: http://localhost:5173
echo  - Backend API: http://localhost:8000
echo  - API Docs: http://localhost:8000/docs
echo ===================================================
echo.
pause
