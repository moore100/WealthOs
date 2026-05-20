export interface IncomeSource {
  id: number
  name: string
  type: 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'other'
  amount: number
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  currency: string
  active: 0 | 1
  created_at: string
}

export interface Category {
  id: number
  name: string
  icon: string
  color: string
  monthly_budget: number
  type: 'expense' | 'income'
  created_at: string
}

export interface Expense {
  id: number
  category_id: number | null
  name: string
  amount: number
  date: string
  type: 'fixed' | 'variable'
  is_recurring: 0 | 1
  recurrence_interval: string | null
  notes: string | null
  merchant: string | null
  payment_method: string
  is_bad_habit: 0 | 1
  created_at: string
  // Joined fields
  category_name?: string
  category_icon?: string
  category_color?: string
}

export interface Loan {
  id: number
  name: string
  lender: string | null
  principal_amount: number
  remaining_balance: number
  interest_rate: number
  monthly_payment: number
  payment_day: number | null
  start_date: string | null
  end_date: string | null
  type: 'personal' | 'mortgage' | 'car' | 'student' | 'business' | 'credit_card' | 'other'
  notes: string | null
  created_at: string
}

export interface LoanPayment {
  id: number
  loan_id: number
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export interface SavingsGoal {
  id: number
  name: string
  icon: string
  target_amount: number
  current_amount: number
  target_date: string | null
  monthly_contribution: number
  priority: number
  color: string
  notes: string | null
  completed_at: string | null
  created_at: string
}

export interface Investment {
  id: number
  name: string
  type: 'stock' | 'etf' | 'crypto' | 'bond' | 'real_estate' | 'mutual_fund' | 'sacco' | 'mmf' | 'other'
  ticker_symbol: string | null
  amount_invested: number
  current_value: number
  purchase_date: string | null
  platform: string | null
  notes: string | null
  created_at: string
}

export interface PersonOwed {
  id: number
  name: string
  phone: string | null
  amount: number
  direction: 'i_owe' | 'they_owe'
  description: string | null
  due_date: string | null
  paid: 0 | 1
  created_at: string
}

export interface BadHabit {
  id: number
  name: string
  category: string
  avg_weekly_spend: number
  times_per_week: number
  notes: string | null
  tracking_since: string
  created_at: string
}

export interface BadHabitLog {
  id: number
  habit_id: number
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export interface Subscription {
  id: number
  name: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  next_billing_date: string | null
  category: string
  active: 0 | 1
  notes: string | null
  created_at: string
}

export interface DateBudget {
  id: number
  name: string
  date: string
  total_budget: number
  spent: number
  venue: string | null
  notes: string | null
  rating: number
  created_at: string
}

export interface DateBudgetItem {
  id: number
  date_budget_id: number
  item: string
  estimated_cost: number
  actual_cost: number
  created_at: string
}

export interface NetWorthSnapshot {
  id: number
  total_assets: number
  total_liabilities: number
  net_worth: number
  snapshot_date: string
}

export interface AiInsight {
  id: number
  type: 'info' | 'warning' | 'success' | 'urgent'
  content: string
  action_taken: 0 | 1
  created_at: string
}

export interface MoodLog {
  id: number
  mood: string
  note: string
  date: string
  created_at: string
}

export interface PersonPayment {
  id: number
  person_name: string
  phone: string | null
  amount: number
  payment_method: string
  frequency: string
  next_payment_date: string | null
  notes: string | null
  created_at: string
}

export interface AppSettings {
  country?: string
  currency?: string
  currencySymbol?: string
  locale?: string
  onboardingComplete?: boolean
  userName?: string
  name?: string
  email?: string
  monthly_income?: number
  openaiKey?: string
  notificationsEnabled?: boolean
  dailyMoodReminderTime?: string
  ai_name?: string
  ai_gender?: string
  ai_avatar?: string
  ai_personality?: string
  ai_instructions?: string
  elevenlabs_key?: string
  ai_voice_enabled?: boolean
  ai_voice_mode?: 'text' | 'voice'
  ai_voice_id?: string
}

export interface ThemeSettings {
  preset?: string
  mode?: 'dark' | 'light' | 'system'
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  card?: string
  muted?: string
  border?: string
  radius?: string
  font?: string
  fontSize?: string
  sidebarStyle?: 'floating' | 'flush' | 'mini' | 'top'
  chartPalette?: 'vivid' | 'pastel' | 'monochrome' | 'neon' | 'earth' | 'ocean'
  cardStyle?: 'default' | 'elevated' | 'glass' | 'flat'
  density?: 'compact' | 'comfortable' | 'spacious'
  motion?: boolean

  // ─── Advanced Design System ──────────────────────────────────────────
  sidebarColor?: string
  sidebarTextColor?: string
  topbarColor?: string
  topbarTextColor?: string
  cardHoverAnimation?: 'none' | 'lift' | 'glow' | 'scale' | 'shine' | 'border-glow'
  cardBorderStyle?: 'default' | 'glow' | 'gradient' | 'neon'
  lightDirection?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'radial'
  glassMorphism?: boolean
  glassBlur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  glassOpacity?: string
  backgroundImage?: string
  backgroundOverlay?: string
  backgroundSize?: 'cover' | 'contain' | 'auto'
  appBlur?: 'none' | 'sm' | 'md' | 'lg'
  animationSpeed?: 'slow' | 'normal' | 'fast'
  hoverIntensity?: 'subtle' | 'medium' | 'strong'
  shadowIntensity?: 'none' | 'soft' | 'medium' | 'strong' | 'neon'
  borderWidth?: 'thin' | 'normal' | 'thick'
  iconStyle?: 'outline' | 'filled' | 'duotone'
  scrollbarStyle?: 'default' | 'thin' | 'hidden' | 'rounded'
  gradientOverlay?: boolean
  ambientGlow?: boolean
  sidebarGlow?: boolean
  [key: string]: any
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date | string
  structured?: {
    type: 'salary_split' | 'investment_suggestion' | 'debt_strategy'
    data: any
  }
  actions?: any[]
}

export interface BudgetRow {
  id: number
  name: string
  icon: string
  color: string
  budget: number
  spent: number
}

export interface DashboardSummary {
  income: number
  expenses: number
  loans: { total_debt: number; monthly_payments: number }
  assets: number
  goalsSaved: number
  totalIncome?: number
  totalExpenses?: number
  goalsCount?: number
  activeLoans?: number
  subscriptionsCount?: number
  peopleOwed?: number
  habitsMonthly?: number
}
