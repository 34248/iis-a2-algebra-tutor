@echo off
setlocal
cd /d "%~dp0"
set "A2_PYTHON=python"
if exist "D:\codex\runtimes\python312\python.exe" set "A2_PYTHON=D:\codex\runtimes\python312\python.exe"
echo Open http://127.0.0.1:8764 after the server starts.
"%A2_PYTHON%" -B app.py --port 8764
pause
