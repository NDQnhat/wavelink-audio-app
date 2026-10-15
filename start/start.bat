@echo off
setlocal
title WaveLink Launcher
cd /d "%~dp0"

:: 1. Duong dan tuong doi
set "BASE_DIR=%~dp0.."
set "SERVER_PY=%~dp0server.py"

:: 2. Xu ly tham so
if /i "%1"=="--stop" goto :DO_STOP
if /i "%1"=="-s" goto :DO_STOP
if /i "%1"=="--backend" goto :DO_BACKEND
if /i "%1"=="-b" goto :DO_BACKEND
if /i "%1"=="--console" goto :RUN_CONSOLE
if /i "%1"=="-c" goto :RUN_CONSOLE
if "%1"=="--silent" goto :RUN_SERVICES

:: 3. Tu dong an cua so CMD khi chay nen mac dinh
mshta "javascript:new ActiveXObject('WScript.Shell').Run('\"%~f0\" --silent',0,false);window.close()" 2>nul
if %ERRORLEVEL% equ 0 exit /b

powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%~f0' -ArgumentList '--silent' -WindowStyle Hidden" 2>nul
if %ERRORLEVEL% equ 0 exit /b

:RUN_SERVICES
where.exe pythonw >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" pythonw "%SERVER_PY%"
    exit /b
)

where.exe python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" /b python "%SERVER_PY%"
    exit /b
)

goto :FALLBACK_DIRECT

:DO_BACKEND
echo ==========================================================
echo   WaveLink - Chay Backend Golang truc tiep bang lenh
echo   Che do: go run (Khong build file .exe)
echo   Cong lang nghe: 8080
echo ==========================================================
echo.
cd /d "%BASE_DIR%\backend"
where.exe go >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay Go tren he thong. Vui long cai dat Golang.
    pause
    exit /b 1
)
go run ./cmd/api/main.go
exit /b

:RUN_CONSOLE
where.exe python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python "%SERVER_PY%"
    exit /b
)
goto :FALLBACK_DIRECT

:FALLBACK_DIRECT
echo [WaveLink] Khoi dong truc tiep bang lenh (Khong build exe)...
start "WaveLink Backend (8080)" cmd /c "cd /d \"%BASE_DIR%\backend\" && go run ./cmd/api/main.go"
start "WaveLink Frontend (5173)" cmd /c "cd /d \"%BASE_DIR%\frontend\" && npm run dev"
timeout /t 3 >nul
start http://localhost:5173
exit /b

:DO_STOP
echo [INFO] Dang tat toan bo tien trinh va giai phong cac cong 9999, 8080, 5173...
powershell -NoProfile -Command "try { Invoke-RestMethod -Uri 'http://localhost:9999/api/shutdown' -Method POST -TimeoutSec 2 | Out-Null } catch {}" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9999 ^| findstr LISTENING') do (if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1)
echo [OK] He thong da tat hoan toan.
exit /b
