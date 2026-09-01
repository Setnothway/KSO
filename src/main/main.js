// ============================================
// Electron Main Process
// ============================================

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true, // Kiosk mode
    kiosk: process.env.NODE_ENV === 'production', // Production kiosk mode
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: false, // Безрамочный режим
    show: false,
  });

  // Загрузка приложения
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// IPC Handlers для связи с renderer
// ============================================

ipcMain.handle('get-theme', async () => {
  try {
    const themePath = path.join(__dirname, '../../public/theme.json');
    const themeData = fs.readFileSync(themePath, 'utf-8');
    return JSON.parse(themeData);
  } catch (error) {
    console.error('Failed to load theme:', error);
    return null;
  }
});

ipcMain.handle('hardware:get-status', async () => {
  // Здесь будет вызов к HAL Manager
  return {
    scanner: { isOnline: true },
    scale: { isOnline: true },
    pos: { isOnline: true },
    fiscal: { isOnline: false, errorCode: 'NOT_CONNECTED' },
  };
});

// ============================================
// Блокировка системных горячих клавиш (Kiosk Mode)
// ============================================

app.on('browser-window-focus', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(true);
  }
});
