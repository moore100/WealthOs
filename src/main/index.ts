import { app, BrowserWindow, shell, ipcMain, nativeTheme, session, systemPreferences } from 'electron'
import { join } from 'path'
import dns from 'dns'
import { is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc-handlers'
import { setupTray } from './tray'
import { setupNotifications } from './notifications'
import { setupWidgetIpc } from './widget'
import { setupNetworkHandlers } from './network'
import { setupPaymentChannelHandlers } from './payment-channels'
import { setupSavingsIntentionHandlers } from './savings-intentions'
import { setupTradingHandlers } from './trading-handlers'

// Fix OpenAI SDK "Connection error" in Electron on Windows by forcing IPv4 DNS first
try { dns.setDefaultResultOrder('ipv4first') } catch { /* older node */ }

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store')

const store = new Store({ name: 'wealthos-settings' })
const themeStore = new Store({ name: 'wealthos-theme' })

let mainWindow: BrowserWindow | null = null

function getThemeForInjection(): string {
  const theme = themeStore.store || {}
  return `window.__wealthosTheme__ = ${JSON.stringify(theme)};`
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    backgroundColor: '#0a0f1a',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Inject theme before page loads
  mainWindow.webContents.on('did-start-loading', () => {
    mainWindow?.webContents.executeJavaScript(getThemeForInjection()).catch(() => {})
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Setup IPC handlers
  setupIpcHandlers(ipcMain, store, themeStore)
  setupWidgetIpc()
  setupNetworkHandlers()
  setupPaymentChannelHandlers()
  setupSavingsIntentionHandlers()
  setupNotifications(mainWindow)
  setupTradingHandlers()
}

app.whenReady().then(async () => {
  // Grant media (microphone/camera) permissions for AI voice chat
  try {
    if (process.platform === 'darwin') {
      try { await systemPreferences.askForMediaAccess('microphone') } catch { /* ignore */ }
    }
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      const allowed = ['media', 'mediaKeySystem', 'audioCapture', 'videoCapture', 'notifications', 'clipboard-read']
      callback(allowed.includes(permission))
    })
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
      const allowed = ['media', 'mediaKeySystem', 'audioCapture', 'videoCapture', 'notifications', 'clipboard-read']
      return allowed.includes(permission)
    })
  } catch (e) {
    console.warn('Permission handler setup failed:', e)
  }

  createWindow()
  setupTray(mainWindow!)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle window controls via IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.on('window:open', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus() }
})
ipcMain.on('window:navigate', (_e, path: string) => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('navigate', path)
  }
})
