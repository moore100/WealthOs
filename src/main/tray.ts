import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { getDb } from '../db/database'
import { getWidgetSummary, toggleWidgetWindow } from './widget'

let tray: Tray | null = null
let tooltipInterval: ReturnType<typeof setInterval> | null = null

function getLiveTooltip(): string {
  try {
    const data = getWidgetSummary()
    const netEmoji = data.netWorth >= 0 ? '🟢' : '🔴'
    return `${netEmoji} NW: $${(data.netWorth / 1000).toFixed(1)}k | Saved: ${data.savingsRate}% | Inc: $${(data.income / 1000).toFixed(1)}k`
  } catch {
    return 'WealthOS — Personal Finance Manager'
  }
}

export function setupTray(mainWindow: BrowserWindow): void {
  try {
    const iconPath = join(__dirname, '../../resources/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    const resizedIcon = icon.isEmpty()
      ? nativeImage.createEmpty()
      : icon.resize({ width: 16, height: 16 })

    tray = new Tray(resizedIcon)
    tray.setToolTip(getLiveTooltip())

    // Update tooltip every 60 seconds
    tooltipInterval = setInterval(() => {
      if (tray) tray.setToolTip(getLiveTooltip())
    }, 60000)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open WealthOS',
        click: () => {
          mainWindow.show()
          mainWindow.focus()
        },
      },
      {
        label: 'Toggle Widget',
        click: () => toggleWidgetWindow(),
      },
      { type: 'separator' },
      {
        label: 'Dashboard',
        click: () => {
          mainWindow.show()
          mainWindow.webContents.send('navigate', '/dashboard')
        },
      },
      {
        label: 'Add Expense',
        click: () => {
          mainWindow.show()
          mainWindow.webContents.send('navigate', '/expenses')
          mainWindow.webContents.send('open-add-expense')
        },
      },
      {
        label: 'Ask WealthOS AI',
        click: () => {
          mainWindow.show()
          mainWindow.webContents.send('navigate', '/ai-chat')
        },
      },
      { type: 'separator' },
      {
        label: 'Quit WealthOS',
        click: () => app.quit(),
      },
    ])

    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    })
  } catch (e) {
    console.warn('Tray setup failed:', e)
  }
}
