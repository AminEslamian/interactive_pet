const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let currentMode = 'dot'; // 'dot' or 'awake'

// Window dimensions
const DOT_SIZE = 64;
const FOX_WIDTH = 520;
const FOX_HEIGHT = 460;

// Persistent position file path
const configPath = path.join(app.getPath('userData'), 'miko_position.json');

function loadSavedPosition() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof data.x === 'number' && typeof data.y === 'number') {
        return data;
      }
    }
  } catch (err) {
    console.error('Error reading position:', err);
  }
  return null;
}

function savePosition(x, y) {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ x, y }), 'utf8');
  } catch (err) {
    console.error('Error saving position:', err);
  }
}

function getDefaultPosition() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  // Default: Bottom-right corner, 40px inset from edges
  const x = Math.round(workArea.x + workArea.width - DOT_SIZE - 40);
  const y = Math.round(workArea.y + workArea.height - DOT_SIZE - 40);
  return { x, y };
}

// Command line flags for hardware-accelerated transparent rendering
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let dotPosition = null;

function createWindow() {
  const saved = loadSavedPosition();
  dotPosition = saved || getDefaultPosition();

  mainWindow = new BrowserWindow({
    width: DOT_SIZE,
    height: DOT_SIZE,
    x: dotPosition.x,
    y: dotPosition.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Load URL: try Vite dev server first, fallback to dist/index.html
  const devUrl = 'http://localhost:3000';
  mainWindow.loadURL(devUrl).catch(() => {
    const prodPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(prodPath);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

function switchMode(mode) {
  if (!mainWindow) return;
  currentMode = mode;

  const [currentX, currentY] = mainWindow.getPosition();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  if (mode === 'awake') {
    // Expanding to Fox Mode
    // Calculate new position so Miko expands upwards and to the left from the dot
    let newX = Math.round(dotPosition.x - (FOX_WIDTH - DOT_SIZE) / 2);
    let newY = Math.round(dotPosition.y - (FOX_HEIGHT - DOT_SIZE));

    // Clamp within workArea
    if (newX < workArea.x) newX = workArea.x;
    if (newX + FOX_WIDTH > workArea.x + workArea.width) newX = workArea.x + workArea.width - FOX_WIDTH;
    if (newY < workArea.y) newY = workArea.y;
    if (newY + FOX_HEIGHT > workArea.y + workArea.height) newY = workArea.y + workArea.height - FOX_HEIGHT;

    mainWindow.setBounds({
      x: newX,
      y: newY,
      width: FOX_WIDTH,
      height: FOX_HEIGHT
    }, true);
  } else {
    // Shrinking back to Dot Mode
    // Return to the saved dot position
    let x = dotPosition.x;
    let y = dotPosition.y;

    // Clamp
    if (x < workArea.x) x = workArea.x;
    if (x + DOT_SIZE > workArea.x + workArea.width) x = workArea.x + workArea.width - DOT_SIZE;
    if (y < workArea.y) y = workArea.y;
    if (y + DOT_SIZE > workArea.y + workArea.height) y = workArea.y + workArea.height - DOT_SIZE;

    mainWindow.setBounds({
      x: x,
      y: y,
      width: DOT_SIZE,
      height: DOT_SIZE
    }, true);
  }
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, '../public/favicon.png');
    let icon = nativeImage.createFromPath(iconPath);
    if (!icon || icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    } else {
      icon = icon.resize({ width: 16, height: 16 });
    }

    tray = new Tray(icon);
    tray.setToolTip('Miko • Minimal Desktop Pet');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Summon Miko (Fox)',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('tray-action', 'awaken');
            switchMode('awake');
          }
        }
      },
      {
        label: 'Rest into Pink Dot',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('tray-action', 'sleep-dot');
            switchMode('dot');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Reset 25m Timer',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('tray-action', 'reset-timer');
          }
        }
      },
      {
        label: 'Reset to Bottom-Right Corner',
        click: () => {
          dotPosition = getDefaultPosition();
          savePosition(dotPosition.x, dotPosition.y);
          switchMode(currentMode);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) {
        if (currentMode === 'dot') {
          mainWindow.webContents.send('tray-action', 'awaken');
          switchMode('awake');
        } else {
          mainWindow.webContents.send('tray-action', 'sleep-dot');
          switchMode('dot');
        }
      }
    });
  } catch (err) {
    console.error('Tray creation error:', err);
  }
}

// IPC Handlers
ipcMain.on('window-drag', (event, { deltaX, deltaY }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  const newX = x + Math.round(deltaX);
  const newY = y + Math.round(deltaY);
  mainWindow.setPosition(newX, newY);

  if (currentMode === 'dot') {
    dotPosition = { x: newX, y: newY };
    savePosition(newX, newY);
  }
});

ipcMain.on('set-mode', (event, mode) => {
  switchMode(mode);
});

ipcMain.on('reset-position', () => {
  dotPosition = getDefaultPosition();
  savePosition(dotPosition.x, dotPosition.y);
  switchMode(currentMode);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(createWindow);

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
