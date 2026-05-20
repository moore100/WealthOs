import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getDb } from '../db/database'

let widgetWindow: BrowserWindow | null = null

export function createWidgetWindow(): BrowserWindow | null {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    return widgetWindow
  }

  widgetWindow = new BrowserWindow({
    width: 320,
    height: 420,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    x: 120,
    y: 80,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  widgetWindow.setAlwaysOnTop(true, 'floating')

  widgetWindow.on('ready-to-show', () => {
    widgetWindow!.show()
    widgetWindow!.setIgnoreMouseEvents(false)
  })

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  // Load the widget route
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    widgetWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/widget`)
  } else {
    widgetWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'widget' })
  }

  return widgetWindow
}

export function closeWidgetWindow(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close()
    widgetWindow = null
  }
}

export function toggleWidgetWindow(): boolean {
  if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible()) {
    widgetWindow.hide()
    return false
  } else {
    const w = createWidgetWindow()
    return w !== null
  }
}

export function getWidgetSummary(): {
  income: number
  expenses: number
  savings: number
  savingsRate: number
  upcoming: { name: string; amount: number; days: number }[]
  netWorth: number
} {
  try {
    const db = getDb()
    const monthStr = new Date().toISOString().slice(0, 7)
    const now = new Date()

    const totalIncome = (db.prepare(
      `SELECT COALESCE(SUM(amount),0) as t FROM income_sources WHERE active = 1`
    ).get() as any).t

    const totalExpenses = (db.prepare(
      `SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?`
    ).get(monthStr) as any).t

    const savings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0

    // Upcoming subscriptions/loans in next 7 days
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const subs = db.prepare(
      `SELECT name, amount FROM subscriptions WHERE next_billing_date <= ? AND active = 1`
    ).all(in7Days) as any[]

    const upcoming = subs.map((s) => ({
      name: s.name,
      amount: s.amount,
      days: 0,
    }))

    // Net worth
    const assets = (db.prepare(`SELECT COALESCE(SUM(current_value),0) as t FROM net_worth_assets`).get() as any)?.t || 0
    const liabilities = (db.prepare(`SELECT COALESCE(SUM(current_balance),0) as t FROM net_worth_liabilities`).get() as any)?.t || 0
    const netWorth = assets - liabilities

    return { income: totalIncome, expenses: totalExpenses, savings, savingsRate, upcoming, netWorth }
  } catch {
    return { income: 0, expenses: 0, savings: 0, savingsRate: 0, upcoming: [], netWorth: 0 }
  }
}

export function setupWidgetIpc(): void {
  ipcMain.handle('widget:toggle', () => toggleWidgetWindow())
  ipcMain.handle('widget:summary', () => getWidgetSummary())
  ipcMain.handle('widget:close', () => { closeWidgetWindow(); return true })
}
