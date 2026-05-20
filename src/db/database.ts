import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

let db: Database.Database | null = null

export function initDatabase(dbPath: string): Database.Database {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables(db)
  seedDefaultData(db)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS income_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'salary',
      amount REAL NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      currency TEXT NOT NULL DEFAULT 'USD',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#6b7280',
      monthly_budget REAL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'expense',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'variable',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_interval TEXT,
      notes TEXT,
      merchant TEXT,
      payment_method TEXT DEFAULT 'cash',
      is_bad_habit INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lender TEXT,
      principal_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      monthly_payment REAL DEFAULT 0,
      payment_day INTEGER,
      start_date TEXT,
      end_date TEXT,
      type TEXT NOT NULL DEFAULT 'personal',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🎯',
      target_amount REAL NOT NULL DEFAULT 0,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      monthly_contribution REAL DEFAULT 0,
      priority INTEGER DEFAULT 3,
      color TEXT DEFAULT '#10b981',
      notes TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'stock',
      ticker_symbol TEXT,
      amount_invested REAL NOT NULL DEFAULT 0,
      current_value REAL NOT NULL DEFAULT 0,
      purchase_date TEXT,
      platform TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people_owed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      amount REAL NOT NULL DEFAULT 0,
      direction TEXT NOT NULL DEFAULT 'i_owe',
      description TEXT,
      due_date TEXT,
      paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bad_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'entertainment',
      avg_weekly_spend REAL DEFAULT 0,
      times_per_week REAL DEFAULT 0,
      notes TEXT,
      tracking_since TEXT DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bad_habit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES bad_habits(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      budgeted REAL NOT NULL DEFAULT 0,
      spent REAL NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS date_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      total_budget REAL NOT NULL DEFAULT 0,
      spent REAL NOT NULL DEFAULT 0,
      venue TEXT,
      notes TEXT,
      rating INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS date_budget_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_budget_id INTEGER NOT NULL REFERENCES date_budgets(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      next_billing_date TEXT,
      category TEXT DEFAULT 'entertainment',
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS net_worth_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_assets REAL NOT NULL DEFAULT 0,
      total_liabilities REAL NOT NULL DEFAULT 0,
      net_worth REAL NOT NULL DEFAULT 0,
      snapshot_date TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'info',
      content TEXT NOT NULL,
      action_taken INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_mood_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mood TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_name TEXT NOT NULL,
      phone TEXT,
      amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      frequency TEXT DEFAULT 'monthly',
      next_payment_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT,
      scheduled_at TEXT NOT NULL,
      repeat TEXT NOT NULL DEFAULT 'none',
      category TEXT NOT NULL DEFAULT 'custom',
      triggered INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS theme_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL DEFAULT '1.0.0',
      author TEXT,
      file_name TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tax_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tax_year INTEGER NOT NULL,
      total_income REAL NOT NULL DEFAULT 0,
      taxable_income REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      credits REAL NOT NULL DEFAULT 0,
      tax_paid REAL NOT NULL DEFAULT 0,
      estimated_tax_due REAL NOT NULL DEFAULT 0,
      filing_status TEXT NOT NULL DEFAULT 'single',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'receipt',
      file_path TEXT,
      tags TEXT,
      related_entity TEXT,
      related_id INTEGER,
      notes TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 3,
      category TEXT DEFAULT 'general',
      target_date TEXT,
      savings_allocated REAL NOT NULL DEFAULT 0,
      purchased INTEGER NOT NULL DEFAULT 0,
      purchased_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cash_flow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'income',
      amount REAL NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      end_date TEXT,
      source_id INTEGER,
      source_table TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sinking_funds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL DEFAULT 0,
      current_amount REAL NOT NULL DEFAULT 0,
      monthly_contribution REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'general',
      icon TEXT DEFAULT '🪣',
      color TEXT DEFAULT '#3b82f6',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL DEFAULT 0,
      savings_rate REAL NOT NULL DEFAULT 0,
      debt_to_income REAL NOT NULL DEFAULT 0,
      budget_adherence REAL NOT NULL DEFAULT 0,
      emergency_fund_months REAL NOT NULL DEFAULT 0,
      investment_ratio REAL NOT NULL DEFAULT 0,
      breakdown TEXT,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migration: Couple Sync Mode tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS couple_partner (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      monthly_income REAL NOT NULL DEFAULT 0,
      net_worth REAL NOT NULL DEFAULT 0,
      avatar TEXT,
      relationship_start TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shared_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      paid_by TEXT NOT NULL DEFAULT 'me',
      split_ratio REAL NOT NULL DEFAULT 0.5,
      category TEXT,
      notes TEXT,
      settled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migration: Payment Channels
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'payhero',
      enabled INTEGER NOT NULL DEFAULT 0,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER REFERENCES payment_channels(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'payment',
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT,
      external_reference TEXT,
      phone_number TEXT,
      provider TEXT,
      response TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migration: Savings Intentions
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_intentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'month',
      start_date TEXT NOT NULL DEFAULT (date('now')),
      end_date TEXT,
      target_amount REAL,
      status TEXT NOT NULL DEFAULT 'active',
      ai_plan TEXT NOT NULL DEFAULT '{}',
      plan_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS intention_checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intention_id INTEGER NOT NULL REFERENCES savings_intentions(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      amount REAL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migration: Trading — Brokers & Trades
  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_brokers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL DEFAULT 'binance',
      label TEXT NOT NULL,
      api_key_encrypted TEXT,
      api_secret_encrypted TEXT,
      is_testnet INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 0,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migration: add mode column to trading_brokers
  const brokerCols = db.prepare('PRAGMA table_info(trading_brokers)').all() as any[]
  if (!brokerCols.some((c) => c.name === 'mode')) {
    db.prepare("ALTER TABLE trading_brokers ADD COLUMN mode TEXT NOT NULL DEFAULT 'testnet'").run()
    db.prepare("UPDATE trading_brokers SET mode = 'testnet' WHERE is_testnet = 1").run()
    db.prepare("UPDATE trading_brokers SET mode = 'live' WHERE is_testnet = 0").run()
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS trading_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broker_id INTEGER NOT NULL REFERENCES trading_brokers(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      entry_price REAL NOT NULL DEFAULT 0,
      stop_loss REAL,
      take_profit REAL,
      status TEXT NOT NULL DEFAULT 'open',
      external_order_id TEXT,
      pnl REAL,
      closed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS trading_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broker_id INTEGER NOT NULL REFERENCES trading_brokers(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL NOT NULL,
      take_profit REAL,
      stop_loss REAL,
      strategy TEXT,
      confidence INTEGER DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'pending',
      external_order_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migration: add regret tracking columns to expenses
  const expenseCols = db.prepare('PRAGMA table_info(expenses)').all() as any[]
  if (!expenseCols.some(c => c.name === 'regret')) {
    db.prepare('ALTER TABLE expenses ADD COLUMN regret INTEGER NOT NULL DEFAULT 0').run()
  }
  if (!expenseCols.some(c => c.name === 'regret_note')) {
    db.prepare('ALTER TABLE expenses ADD COLUMN regret_note TEXT').run()
  }
  if (!expenseCols.some(c => c.name === 'mood_at_purchase')) {
    db.prepare('ALTER TABLE expenses ADD COLUMN mood_at_purchase TEXT').run()
  }

  // Migration: drop old knowledge_base with multi-column schema and recreate
  const kbExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_base'").get() as any
  if (kbExists) {
    const cols = db.prepare('PRAGMA table_info(knowledge_base)').all() as any[]
    const hasOldCols = cols.some(c => c.name === 'category' || c.name === 'key')
    if (hasOldCols) {
      db.prepare('DROP TABLE knowledge_base').run()
      db.prepare(`CREATE TABLE knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`).run()
    }
  }
}

function seedDefaultData(db: Database.Database): void {
  // Only seed if categories table is empty
  const count = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count
  if (count > 0) return

  const defaultCategories = [
    { name: 'Food & Dining', icon: '🍽️', color: '#f97316', monthly_budget: 300, type: 'expense' },
    { name: 'Transport', icon: '🚗', color: '#3b82f6', monthly_budget: 150, type: 'expense' },
    { name: 'Housing', icon: '🏠', color: '#8b5cf6', monthly_budget: 1000, type: 'expense' },
    { name: 'Entertainment', icon: '🎬', color: '#ec4899', monthly_budget: 100, type: 'expense' },
    { name: 'Healthcare', icon: '💊', color: '#10b981', monthly_budget: 100, type: 'expense' },
    { name: 'Shopping', icon: '🛍️', color: '#f59e0b', monthly_budget: 200, type: 'expense' },
    { name: 'Education', icon: '📚', color: '#06b6d4', monthly_budget: 50, type: 'expense' },
    { name: 'Personal Care', icon: '💆', color: '#d946ef', monthly_budget: 60, type: 'expense' },
    { name: 'Travel', icon: '✈️', color: '#14b8a6', monthly_budget: 100, type: 'expense' },
    { name: 'Salary', icon: '💰', color: '#22c55e', monthly_budget: 0, type: 'income' },
    { name: 'Freelance', icon: '💻', color: '#84cc16', monthly_budget: 0, type: 'income' },
    { name: 'Business', icon: '🏢', color: '#eab308', monthly_budget: 0, type: 'income' },
    { name: 'Investment', icon: '📈', color: '#a3e635', monthly_budget: 0, type: 'income' },
    { name: 'Other Income', icon: '💵', color: '#4ade80', monthly_budget: 0, type: 'income' },
  ]

  const stmt = db.prepare('INSERT INTO categories (name, icon, color, monthly_budget, type) VALUES (?, ?, ?, ?, ?)')
  defaultCategories.forEach(cat => stmt.run(cat.name, cat.icon, cat.color, cat.monthly_budget, cat.type))
}
