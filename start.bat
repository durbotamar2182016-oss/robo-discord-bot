@echo off
title Robo Bot Console - Auto Restart
:loop
echo [%time%] Starting Robo Bot...
node index.js
echo.
echo [%time%] Bot stopped or crashed. Restarting in 5 seconds...
timeout /t 5 >nul
goto loop
