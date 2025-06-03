# Clinic Queue Display - Standalone Application

## 🎯 Overview

The Clinic Queue Display is now available as a standalone Windows application (.exe) that displays the patient queue on an external HDMI display/TV.

## 📁 Installation & Usage

### Option 1: Run the Installer (Recommended)
1. Navigate to the `dist` folder
2. Run `Clinic Queue Display Setup 1.0.0.exe`
3. Follow the installation wizard
4. The app will be installed and shortcuts created on desktop/start menu

### Option 2: Run Portable Version
1. Navigate to `dist/win-unpacked` folder
2. Run `Clinic Queue Display.exe` directly (no installation required)

## 🔌 HDMI Detection

The app now includes intelligent HDMI detection:

### When HDMI is Connected:
- ✅ App automatically detects external display/TV
- ✅ Runs in full-screen kiosk mode on the external display
- ✅ Shows green "HDMI Connected" indicator

### When HDMI is NOT Connected:
- ⚠️ Shows warning dialog asking to connect HDMI
- ⚠️ Red "HDMI Not Connected" indicator displayed
- ⚠️ Runs on primary display for testing purposes
- 🔄 Can continue anyway or exit to connect HDMI

### Real-time HDMI Detection:
- 🔄 Automatically detects when HDMI is plugged/unplugged
- 📺 Moves display to external monitor when HDMI is connected
- 💬 Shows notification dialogs for connection changes

## 🚫 Changes Made

### ❌ Removed Auto-Startup
- No longer starts automatically with Windows
- Must be launched manually when needed
- Removed auto-launch dependency and code

### ✅ Added Features
- HDMI connection status indicator in UI
- Warning dialogs for HDMI connection issues
- Real-time display detection and switching
- Portable .exe application
- Installation package with shortcuts

## 🎮 Usage Instructions

1. **Launch the app** using the desktop shortcut or from Start Menu
2. **Check HDMI status** - green = connected, red = not connected
3. **Connect HDMI** if needed and restart the app for full-screen mode
4. **The app will display** the patient queue from your clinic server
5. **Close the app** manually when done (only in development mode)

## 🔧 Development

To run in development mode with controls:
```bash
cd electron-display
pnpm run dev
```

To rebuild the .exe:
```bash
cd electron-display
pnpm run build-win
```

## 📋 Production Notes

- In production mode (normal .exe run), the app has no window controls
- Full kiosk mode prevents accidental closing
- Only HDMI-connected displays trigger full kiosk mode
- App prevents multiple instances from running simultaneously 