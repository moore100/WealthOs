import { Notification, BrowserWindow } from 'electron'
import { getDb } from '../db/database'

let hourlyInterval: ReturnType<typeof setInterval> | null = null
let minuteInterval: ReturnType<typeof setInterval> | null = null

export function setupNotifications(mainWindow: BrowserWindow): void {
  // Reminder scheduler — every 60 seconds
  checkReminders(mainWindow)
  minuteInterval = setInterval(() => checkReminders(mainWindow), 60 * 1000)

  // Payment/subscription/budget checks — every hour
  checkNotifications(mainWindow)
  hourlyInterval = setInterval(() => checkNotifications(mainWindow), 60 * 60 * 1000)
}

// ─── User reminders ──────────────────────────────────────────────────────────
function checkReminders(mainWindow: BrowserWindow): void {
  try {
    const db = getDb()
    const nowIso = new Date().toISOString()

    const due = db.prepare(`
      SELECT * FROM reminders
      WHERE active = 1 AND triggered = 0 AND scheduled_at <= ?
    `).all(nowIso) as any[]

    due.forEach((r) => {
      sendNotification(`⏰ ${r.title}`, r.body || '', mainWindow)

      if (r.repeat === 'none') {
        db.prepare('UPDATE reminders SET triggered = 1 WHERE id = ?').run(r.id)
      } else {
        const next = getNextRepeat(r.scheduled_at, r.repeat)
        db.prepare('UPDATE reminders SET scheduled_at = ?, triggered = 0 WHERE id = ?').run(next, r.id)
      }
    })
  } catch (_) {}
}

function getNextRepeat(iso: string, repeat: string): string {
  const d = new Date(iso)
  if (repeat === 'daily')   d.setDate(d.getDate() + 1)
  if (repeat === 'weekly')  d.setDate(d.getDate() + 7)
  if (repeat === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

// ─── Automatic financial checks ──────────────────────────────────────────────
function checkNotifications(mainWindow: BrowserWindow): void {
  try {
    const db = getDb()
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in1Day  = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    const dateStr = (d: Date) => d.toISOString().split('T')[0]
    const monthStr = now.toISOString().slice(0, 7)

    // Loans due in 3 days
    const upcomingLoans = db.prepare(
      'SELECT name, monthly_payment, payment_day FROM loans WHERE payment_day IS NOT NULL'
    ).all() as any[]
    upcomingLoans.forEach((loan) => {
      const paymentDate = new Date(now.getFullYear(), now.getMonth(), loan.payment_day)
      const daysUntil = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil === 3) {
        sendNotification(
          '💳 Loan Payment Due in 3 Days',
          `"${loan.name}" — ${loan.monthly_payment} due on the ${loan.payment_day}th`,
          mainWindow
        )
      }
    })

    // Subscriptions renewing tomorrow
    const renewingTomorrow = db.prepare(
      'SELECT name, amount FROM subscriptions WHERE next_billing_date = ? AND active = 1'
    ).all(dateStr(in1Day)) as any[]
    renewingTomorrow.forEach((sub) => {
      sendNotification('🔄 Subscription Renewing Tomorrow', `"${sub.name}" — ${sub.amount}`, mainWindow)
    })

    // Subscriptions renewing in 3 days
    const renewingIn3 = db.prepare(
      'SELECT name, amount FROM subscriptions WHERE next_billing_date = ? AND active = 1'
    ).all(dateStr(in3Days)) as any[]
    renewingIn3.forEach((sub) => {
      sendNotification('📅 Upcoming Subscription', `"${sub.name}" renews in 3 days — ${sub.amount}`, mainWindow)
    })

    // Savings goals completed today
    const completedGoals = db.prepare(`
      SELECT name FROM savings_goals
      WHERE current_amount >= target_amount
      AND completed_at IS NOT NULL AND date(completed_at) = date('now')
    `).all() as any[]
    completedGoals.forEach((goal) => {
      sendNotification('🎉 Savings Goal Achieved!', `You've reached your "${goal.name}" goal!`, mainWindow)
    })

    // Budget overspend alerts — only check once per day (at the hourly run nearest to 9am)
    if (now.getHours() === 9) {
      const budgets = db.prepare(`
        SELECT c.name, c.monthly_budget, COALESCE(SUM(e.amount), 0) as spent
        FROM categories c
        LEFT JOIN expenses e ON e.category_id = c.id AND strftime('%Y-%m', e.date) = ?
        WHERE c.monthly_budget > 0 AND c.type = 'expense'
        GROUP BY c.id
        HAVING spent > c.monthly_budget
      `).all(monthStr) as any[]
      budgets.forEach((b) => {
        sendNotification(
          '⚠️ Budget Exceeded',
          `You've overspent your ${b.name} budget (${b.spent.toFixed(0)} / ${b.monthly_budget})`,
          mainWindow
        )
      })
    }

    // Savings Intentions — remind about due checkpoints (multiple times a day)
    try {
      const dueCheckpoints = db.prepare(`
        SELECT c.*, i.description as intention_description
        FROM intention_checkpoints c
        JOIN savings_intentions i ON i.id = c.intention_id
        WHERE c.completed = 0 AND c.scheduled_at <= datetime('now') AND i.status = 'active'
        ORDER BY c.scheduled_at ASC
        LIMIT 3
      `).all() as any[]
      dueCheckpoints.forEach((cp) => {
        sendNotification(
          `💰 Time to Save — ${cp.intention_description.slice(0, 30)}${cp.intention_description.length > 30 ? '...' : ''}`,
          cp.prompt || 'Your savings checkpoint is due!',
          mainWindow
        )
      })
    } catch (_) {}

    // Daily AI summary at 8am
    if (now.getHours() === 8) {
      try {
        const totalExpenses = (db.prepare(
          `SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?`
        ).get(monthStr) as any).t
        const totalIncome = (db.prepare(
          `SELECT COALESCE(SUM(amount),0) as t FROM income WHERE strftime('%Y-%m',date)=?`
        ).get(monthStr) as any).t
        const net = totalIncome - totalExpenses
        sendNotification(
          '📊 WealthOS Daily Summary',
          `This month: Income ${totalIncome.toFixed(0)} | Expenses ${totalExpenses.toFixed(0)} | Net ${net >= 0 ? '+' : ''}${net.toFixed(0)}`,
          mainWindow
        )
      } catch (_) {}
    }

  } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function sendNotification(title: string, body: string, mainWindow?: BrowserWindow): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, silent: false })
  if (mainWindow) {
    n.on('click', () => { mainWindow.show(); mainWindow.focus() })
  }
  n.show()
}

export function sendCustomNotification(title: string, body: string): void {
  sendNotification(title, body)
}
