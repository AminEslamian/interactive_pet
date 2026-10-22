const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  dragWindow: (deltaX, deltaY) => ipcRenderer.send('window-drag', { deltaX, deltaY }),
  setMode: (mode) => ipcRenderer.send('set-mode', mode),
  savePosition: (pos) => ipcRenderer.send('save-position', pos),
  resetPosition: () => ipcRenderer.send('reset-position'),
  minimize: () => ipcRenderer.send('window-minimize'),
  quitApp: () => ipcRenderer.send('quit-app'),
  onTrayAction: (callback) => {
    ipcRenderer.on('tray-action', (event, action) => callback(action));
  }
});
