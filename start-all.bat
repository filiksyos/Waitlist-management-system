@echo off
echo Starting Clinic Waitlist System...

echo Starting WebSocket server...
start "WebSocket Server" cmd /k "node server.js"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Starting Electron Display App...
cd electron-display
start "Electron Display" cmd /k "npm start"
cd ..

echo.
echo System started! 
echo - WebSocket Server: http://localhost:8080
echo - Receptionist: Open Receptionist.html in browser
echo - Doctor: Open Doctor.html in browser  
echo - Test: Open test-connectivity.html in browser
echo - Display: Electron app should open automatically
echo.
echo Press any key to close this window...
pause >nul 