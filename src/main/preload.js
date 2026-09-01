// ============================================
// Electron Preload Script
// Безопасный мост между main и renderer процессами
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

// Экспонирование API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Тема
  getTheme: () => ipcRenderer.invoke('get-theme'),
  
  // Оборудование
  getHardwareStatus: () => ipcRenderer.invoke('hardware:get-status'),
  
  // Подписка на события оборудования
  onHardwareEvent: (callback) => {
    ipcRenderer.on('hardware-event', (event, data) => callback(data));
  },
  
  // Отправка событий сканера
  sendScanEvent: (barcode) => ipcRenderer.send('scanner:scan', barcode),
  
  // Kiosk режим
  setFullScreen: (fullscreen) => ipcRenderer.invoke('set-fullscreen', fullscreen),
});

// Версия приложения
contextBridge.exposeInMainWorld('appVersion', {
  version: process.env.npm_package_version || '1.0.0',
  isDevelopment: process.env.NODE_ENV === 'development',
});
