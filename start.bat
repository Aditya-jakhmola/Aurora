@echo off
cd /d "%~dp0backend"
if not exist node_modules (
    echo Installing Aurora backend dependencies...
    call npm.cmd install
)
call npm.cmd start
pause
