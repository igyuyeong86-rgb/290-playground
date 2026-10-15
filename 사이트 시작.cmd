@echo off
cd /d "%~dp0"
set "ASTRAL_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%ASTRAL_NODE%" set "ASTRAL_NODE=node"
"%ASTRAL_NODE%" scripts\run-framework.mjs dev
pause
