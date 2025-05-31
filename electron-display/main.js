const { app, BrowserWindow } = require('electron');
app.disableHardwareAcceleration();
const path = require('path');
const DisplayManager = require('./utils/display-manager');
const AutoLaunchManager = require('./utils/auto-launch');

// Global instances
let mainWindow = null;
let displayManager = null;
let autoLaunchManager = null;
const isDevelopment = process.argv.includes('--dev');

function createWindow() {
  // Initialize display manager
  displayManager = new DisplayManager();
  const displayInfo = displayManager.detectDisplays();
  
  console.log('Display configuration:', displayInfo);
  
  // Get TV display bounds
  const tvBounds = displayManager.getTVWindowBounds();
  const isTVAvailable = displayManager.isTVDisplayAvailable();
  
  console.log('TV Display Available:', isTVAvailable);
  console.log('Window bounds:', tvBounds);

  // Create the browser window with kiosk mode settings
  mainWindow = new BrowserWindow({
    x: tvBounds.x,
    y: tvBounds.y,
    width: tvBounds.width,
    height: tvBounds.height,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    // Kiosk mode settings
    frame: !isDevelopment, // No frame in production
    fullscreen: !isDevelopment, // Fullscreen in production
    alwaysOnTop: !isDevelopment, // Always on top in production
    resizable: isDevelopment, // Not resizable in production
    movable: isDevelopment, // Not movable in production
    minimizable: isDevelopment, // Not minimizable in production
    maximizable: isDevelopment, // Not maximizable in production
    closable: isDevelopment, // Not closable in production (prevents accidental closing)
    autoHideMenuBar: true, // Hide menu bar
    kiosk: !isDevelopment // True kiosk mode in production
  });

  // Load the display page
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (!isDevelopment) {
      // In production, ensure window stays on TV display
      mainWindow.setPosition(tvBounds.x, tvBounds.y);
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    
    console.log('Window displayed on TV:', isTVAvailable ? 'Yes' : 'No (using primary)');
  });

  // Open DevTools in development
  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });

  // Handle display changes
  displayManager.onDisplayChanged((changeType, newDisplayInfo) => {
    console.log('Display changed:', changeType, newDisplayInfo);
    
    if (changeType === 'added' && newDisplayInfo.tv && !isDevelopment) {
      // TV was connected, move window to TV
      const newTVBounds = displayManager.getTVWindowBounds();
      mainWindow.setPosition(newTVBounds.x, newTVBounds.y);
      mainWindow.setSize(newTVBounds.width, newTVBounds.height);
    }
  });

  // Disable keyboard shortcuts that could exit kiosk mode
  if (!isDevelopment) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Disable Alt+F4, F11, Escape, etc.
      if (input.key === 'F4' && input.alt) {
        event.preventDefault();
      }
      if (input.key === 'F11') {
        event.preventDefault();
      }
      if (input.key === 'Escape') {
        event.preventDefault();
      }
    });
  }
}

// App event handlers
app.whenReady().then(async () => {
  // Initialize auto-launch manager
  autoLaunchManager = new AutoLaunchManager();
  
  // Setup auto-launch based on mode
  await autoLaunchManager.setup();
  
  // Log auto-launch status
  const autoLaunchStatus = await autoLaunchManager.getStatus();
  console.log('Auto-launch status:', autoLaunchStatus);
  
  // Create the main window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Graceful shutdown
app.on('before-quit', () => {
  console.log('Application shutting down...');
});

// Handle app startup arguments for production
if (!isDevelopment) {
  // Single instance lock (prevent multiple instances)
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      // Someone tried to run a second instance, focus our window instead
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
} 