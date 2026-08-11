@echo off
title HTC Insight Control Center
cls

:MENU
cls
echo ===================================================
echo             HTC Insight Control Center
echo ===================================================
echo.

set "BE_STATUS=STOPPED"
set "BE_TAG=[OFF]"
netstat -ano | findstr LISTENING | findstr :8000 >nul 2>&1
if not errorlevel 1 (
    set "BE_STATUS=RUNNING  http://localhost:8000"
    set "BE_TAG=[ON ]"
)

set "FE_STATUS=STOPPED"
set "FE_TAG=[OFF]"
netstat -ano | findstr LISTENING | findstr :3000 >nul 2>&1
if not errorlevel 1 (
    set "FE_STATUS=RUNNING  http://localhost:3000"
    set "FE_TAG=[ON ]"
)

echo  Current Services Status:
echo    %BE_TAG% Backend  (FastAPI) : %BE_STATUS%
echo    %FE_TAG% Frontend (Next.js) : %FE_STATUS%
echo.
echo ===================================================
echo  Control Menu Options:
echo.
echo    [1] Toggle Backend  (FastAPI  :8000)
echo    [2] Toggle Frontend (Next.js  :3000)
echo    [3] Start Both Services
echo    [4] Stop Both Services
echo    [5] Refresh Status
echo    [0] Exit
echo.
echo ===================================================
echo.

set "OPTION="
set /p OPTION="Select option (0-5) and press Enter: "

if "%OPTION%"=="1" goto TOGGLE_BE
if "%OPTION%"=="2" goto TOGGLE_FE
if "%OPTION%"=="3" goto START_ALL
if "%OPTION%"=="4" goto STOP_ALL
if "%OPTION%"=="5" goto MENU
if "%OPTION%"=="0" goto END
goto MENU

:TOGGLE_BE
netstat -ano | findstr LISTENING | findstr :8000 >nul 2>&1
if not errorlevel 1 (
    echo.
    echo Stopping Backend on Port 8000...
    powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    timeout /t 1 >nul
) else (
    echo.
    echo Starting Backend (FastAPI)...
    if exist "backend\.venv\Scripts\activate.bat" (
        start "HTC_Backend_Window" cmd /k "cd backend && call .venv\Scripts\activate && uvicorn main:app --reload --port 8000"
    ) else if exist "backend\venv\Scripts\activate.bat" (
        start "HTC_Backend_Window" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"
    ) else (
        start "HTC_Backend_Window" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"
    )
    timeout /t 1 >nul
)
goto MENU

:TOGGLE_FE
netstat -ano | findstr LISTENING | findstr :3000 >nul 2>&1
if not errorlevel 1 (
    echo.
    echo Stopping Frontend on Port 3000...
    powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    timeout /t 1 >nul
) else (
    echo.
    echo Starting Frontend (Next.js)...
    start "HTC_Frontend_Window" cmd /k "cd frontend && npm run dev"
    timeout /t 1 >nul
)
goto MENU

:START_ALL
echo.
echo Starting all services...
netstat -ano | findstr LISTENING | findstr :8000 >nul 2>&1
if errorlevel 1 (
    if exist "backend\.venv\Scripts\activate.bat" (
        start "HTC_Backend_Window" cmd /k "cd backend && call .venv\Scripts\activate && uvicorn main:app --reload --port 8000"
    ) else if exist "backend\venv\Scripts\activate.bat" (
        start "HTC_Backend_Window" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"
    ) else (
        start "HTC_Backend_Window" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"
    )
)
netstat -ano | findstr LISTENING | findstr :3000 >nul 2>&1
if errorlevel 1 (
    start "HTC_Frontend_Window" cmd /k "cd frontend && npm run dev"
)
timeout /t 1 >nul
goto MENU

:STOP_ALL
echo.
echo Stopping all services...
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }" >nul 2>&1
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 >nul
goto MENU

:END
exit /b 0
