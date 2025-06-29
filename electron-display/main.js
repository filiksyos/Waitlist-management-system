const path = require('path');
const fs = require('fs');

// Load .env file - different paths for development vs production
let envPath;
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

console.log('=== DOTENV LOADING DEBUG ===');
console.log('isDev check:', isDev);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('process.argv:', process.argv);
console.log('__dirname:', __dirname);
console.log('process.resourcesPath:', process.resourcesPath);

if (isDev) {
  // Development: .env is in parent directory
  envPath = path.join(__dirname, '..', '.env');
} else {
  // Production: .env is packaged inside the app
  envPath = path.join(__dirname, '.env');
}

console.log('Environment:', isDev ? 'development' : 'production');
console.log('Loading .env from:', envPath);
console.log('.env exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log('.env file contents preview:', fs.readFileSync(envPath, 'utf8').substring(0, 200));
}

const dotenvResult = require('dotenv').config({ path: envPath });
console.log('dotenv.config result:', dotenvResult);

console.log('=== ENVIRONMENT VARIABLES AFTER LOADING ===');
console.log('DOCTOR_COUNT:', process.env.DOCTOR_COUNT);
console.log('MAX_PATIENTS_DISPLAYED:', process.env.MAX_PATIENTS_DISPLAYED);
console.log('DOCTOR_1_NAME:', process.env.DOCTOR_1_NAME);
console.log('DOCTOR_2_NAME:', process.env.DOCTOR_2_NAME);
console.log('=== END DEBUG ===');

const { app, BrowserWindow, dialog } = require('electron');
app.disableHardwareAcceleration();
const DisplayManager = require('./utils/display-manager');

// Global instances
let mainWindow = null;
let displayManager = null;
const isDevelopment = process.argv.includes('--dev');

// Doctor count management
function getDoctorCount() {
  const count = process.env.DOCTOR_COUNT || '1';
  console.log('=== getDoctorCount() DEBUG ===');
  console.log('process.env.DOCTOR_COUNT:', process.env.DOCTOR_COUNT);
  console.log('count variable:', count);
  const result = parseInt(count) === 2 ? 2 : 1;
  console.log('parsed result:', result);
  console.log('=== END getDoctorCount() DEBUG ===');
  return result;
}

// Max patients displayed management
function getMaxPatientsDisplayed() {
  const maxPatients = process.env.MAX_PATIENTS_DISPLAYED || '10';
  console.log('=== getMaxPatientsDisplayed() DEBUG ===');
  console.log('process.env.MAX_PATIENTS_DISPLAYED:', process.env.MAX_PATIENTS_DISPLAYED);
  console.log('maxPatients variable:', maxPatients);
  const parsed = parseInt(maxPatients);
  console.log('parsed value:', parsed);
  
  // Validate range: minimum 1, maximum 20 (practical limits)
  if (isNaN(parsed) || parsed < 1 || parsed > 20) {
    console.warn(`Invalid MAX_PATIENTS_DISPLAYED value: ${maxPatients}. Using default: 10`);
    console.log('=== END getMaxPatientsDisplayed() DEBUG (using default) ===');
    return 10;
  }
  
  console.log(`Max patients displayed configured: ${parsed}`);
  console.log('=== END getMaxPatientsDisplayed() DEBUG ===');
  return parsed;
}

// Doctor names management
function getDoctorNames() {
  console.log('=== getDoctorNames() DEBUG ===');
  console.log('process.env.DOCTOR_1_NAME:', process.env.DOCTOR_1_NAME);
  console.log('process.env.DOCTOR_2_NAME:', process.env.DOCTOR_2_NAME);
  const doctor1Name = process.env.DOCTOR_1_NAME || 'Doctor 1';
  const doctor2Name = process.env.DOCTOR_2_NAME || 'Doctor 2';
  
  console.log(`Doctor names configured: "${doctor1Name}", "${doctor2Name}"`);
  console.log('=== END getDoctorNames() DEBUG ===');
  return { doctor1Name, doctor2Name };
}

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

  // If no HDMI/TV display detected, show dialog to user
  if (!isTVAvailable && !isDevelopment) {
    const result = dialog.showMessageBoxSync(null, {
      type: 'warning',
      title: 'HDMI Display Not Detected',
      message: 'No HDMI display detected for the clinic queue display.',
      detail: 'Please connect an HDMI cable to an external display/TV and restart the application.\n\nThe app will now run on your primary display for testing purposes.',
      buttons: ['Continue Anyway', 'Exit'],
      defaultId: 0,
      cancelId: 1
    });
    
    if (result === 1) {
      app.quit();
      return;
    }
  }

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
    frame: isDevelopment, // Frame only in development
    fullscreen: false, // Don't start fullscreen, set it after window is shown
    alwaysOnTop: !isDevelopment, // Always on top in production
    resizable: isDevelopment, // Not resizable in production
    movable: isDevelopment, // Not movable in production
    minimizable: isDevelopment, // Not minimizable in production
    maximizable: isDevelopment, // Not maximizable in production
    closable: isDevelopment, // Not closable in production (prevents accidental closing)
    autoHideMenuBar: true, // Hide menu bar
    kiosk: false // Set kiosk mode after positioning
  });

  // Load the display page
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    // First, position the window on the correct display
    if (isTVAvailable) {
      console.log(`Positioning window on TV at: x=${tvBounds.x}, y=${tvBounds.y}, width=${tvBounds.width}, height=${tvBounds.height}`);
      mainWindow.setPosition(tvBounds.x, tvBounds.y);
      mainWindow.setSize(tvBounds.width, tvBounds.height);
    }
    
    // Show the window first
    mainWindow.show();
    
    // Then apply fullscreen/kiosk mode in production
    if (!isDevelopment && isTVAvailable) {
      setTimeout(() => {
        console.log('Applying production mode settings...');
        mainWindow.setFullScreen(true);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.setKiosk(true);
      }, 100); // Small delay to ensure positioning is complete
    }
    
    console.log('Window displayed on TV:', isTVAvailable ? 'Yes' : 'No (using primary)');
    console.log('Development mode:', isDevelopment);
    
    // Send display status to renderer
    mainWindow.webContents.send('display-status', {
      hdmiConnected: isTVAvailable,
      displayInfo: displayInfo
    });
    
    // Send doctor count to renderer
    const doctorCount = getDoctorCount();
    mainWindow.webContents.send('doctor-count-config', doctorCount);
    
    // Send max patients configuration to renderer
    const maxPatientsDisplayed = getMaxPatientsDisplayed();
    mainWindow.webContents.send('max-patients-config', maxPatientsDisplayed);
    
    // Send doctor names configuration to renderer
    const doctorNames = getDoctorNames();
    mainWindow.webContents.send('doctor-names-config', doctorNames);
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
      mainWindow.setFullScreen(true);
      
      // Notify renderer about HDMI connection
      mainWindow.webContents.send('hdmi-connected', newDisplayInfo);
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'HDMI Connected',
        message: 'HDMI display detected and activated!',
        detail: 'The queue display is now showing on the external display.'
      });
    } else if (changeType === 'removed' && !newDisplayInfo.tv) {
      // TV was disconnected
      mainWindow.webContents.send('hdmi-disconnected');
      
      if (!isDevelopment) {
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'HDMI Disconnected',
          message: 'HDMI display has been disconnected.',
          detail: 'Please reconnect the HDMI cable to the external display.'
        });
      }
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