@echo off
echo Copying .env files to electron apps...
copy .env electron-display\.env
copy .env electron-queue\.env
echo .env files copied!

echo.
echo Cleaning build caches...

cd electron-display
if exist dist rmdir /s /q dist
echo Cleaned electron-display/dist

cd ../electron-queue  
if exist dist rmdir /s /q dist
echo Cleaned electron-queue/dist

echo.
echo Building electron-display...
cd ../electron-display
call pnpm run build

echo.
echo Building electron-queue...
cd ../electron-queue
call pnpm run build

echo.
echo Build complete!
cd ..
pause 