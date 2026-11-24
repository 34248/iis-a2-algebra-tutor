@echo off
setlocal
cd /d "%~dp0"
set "A2_PYTHON=python"
if exist "D:\codex\runtimes\python312\python.exe" set "A2_PYTHON=D:\codex\runtimes\python312\python.exe"
echo Open http://127.0.0.1:8766 after the server starts.
"%A2_PYTHON%" -B app.py --port 8766 --open
pause
