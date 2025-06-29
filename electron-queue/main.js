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
const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');

let mainWindow = null;
let settingsWindow = null;
const isDevelopment = process.argv.includes('--dev');

// Doctor count management
function getDoctorCount() {
  const count = process.env.DOCTOR_COUNT || '1';
  return parseInt(count) === 2 ? 2 : 1;
}

function createMainWindow() {
  // Create the main queue manager window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'Queue Manager - Mebrej Clinic'
  });

  // Load the queue manager page
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'queue-manager.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Send doctor count to renderer
    const doctorCount = getDoctorCount();
    mainWindow.webContents.send('doctor-count-config', doctorCount);
    
    if (isDevelopment) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  // Prevent multiple settings windows
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  // Create the settings window
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 600,
    parent: mainWindow,
    modal: true,
    resizable: true,
    minWidth: 480,
    minHeight: 550,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'Settings - Queue Manager'
  });

  // Load the settings page
  settingsWindow.loadFile(path.join(__dirname, 'settings', 'settings.html'));

  // Show window when ready
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  // Handle window closed
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'Ctrl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Queue Manager',
              message: 'Queue Manager v1.0.0',
              detail: 'Clinic Queue Management System\nMebrej Clinic'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createMainWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Prevent multiple instances
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

// IPC handlers for renderer communication
ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('settings-updated', (event, newConfig) => {
  console.log('Settings updated:', newConfig);
  // Notify main window that settings have changed
  if (mainWindow) {
    mainWindow.webContents.send('settings-changed', newConfig);
  }
});

// Graceful shutdown
app.on('before-quit', () => {
  console.log('Queue Manager shutting down...');
}); 