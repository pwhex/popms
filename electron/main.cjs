const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const configDir = app.getPath('userData');
const envFile = path.join(configDir, '.env');

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
if (!fs.existsSync(envFile)) {
  fs.writeFileSync(
    envFile,
    '# POPMS configuration — see .env.example in the app source for all available variables.\n' +
    '# GOOGLE_SERVICE_ACCOUNT_KEY_FILE=\n' +
    '# GOOGLE_SHEETS_ID=\n' +
    '# GOOGLE_DRIVE_FOLDER_ID=\n' +
    '# GOOGLE_OAUTH_CLIENT_ID=\n' +
    '# SESSION_SECRET=\n'
  );
}

process.env.POPMS_ENV_FILE = envFile;
process.env.POPMS_DB_FILE = path.join(configDir, 'popms_database.xlsx');
process.env.POPMS_UPLOADS_DIR = path.join(configDir, 'uploads');
process.env.PORT = process.env.PORT || '8420';

let mainWindow;

async function waitForServer(url, attempts = 40, delayMs = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // server not up yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Config Folder', click: () => shell.openPath(configDir) },
        { label: 'Reload', click: () => mainWindow && mainWindow.reload() },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [{ role: 'toggleDevTools' }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const serverEntry = path.join(__dirname, '..', 'server.js');
  await import(pathToFileURL(serverEntry).href);

  const port = process.env.PORT;
  await waitForServer(`http://localhost:${port}/api/status`);

  buildMenu();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'POPMS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(() => {
  createWindow().catch(err => {
    console.error('[Electron] Failed to start POPMS:', err);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
