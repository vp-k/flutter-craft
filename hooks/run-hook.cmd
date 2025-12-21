: << 'CMDBLOCK'
@echo off
REM Windows: Run script using Git Bash
REM This is a polyglot file that works on both Windows and Unix

REM Try common Git Bash locations
if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" -l "%~dp0%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b
)
if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    "C:\Program Files (x86)\Git\bin\bash.exe" -l "%~dp0%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b
)

REM Try to find bash in PATH
where bash >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    bash -l "%~dp0%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b
)

echo ERROR: Git Bash not found. Please install Git for Windows.
exit /b 1
CMDBLOCK

# Unix/Linux/macOS: Run script directly
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"${SCRIPT_DIR}/$1" "${@:2}"
