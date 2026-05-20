import {
  Category, TrendUp, Wallet, MoneyRemove, RefreshCircle, Danger,
  Card, Profile2User, MoneySend, Flag2, ChartSquare, MoneyChange,
  Calendar, Heart, MessageText, Lamp, Activity, ColorSwatch,
  ProfileCircle, Tag, Key, Data, Shield, Box, Notification, MonitorMobbile, Setting2,
  Routing2, Calculator, ShieldTick,
} from 'iconsax-react'

export type IconComponent = React.ComponentType<{
  variant?: string
  size?: number
  color?: string
  className?: string
}>

export interface NavItem {
  label: string
  icon: IconComponent
  path: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: Category as IconComponent, path: '/dashboard' },
      { label: 'Net Worth', icon: TrendUp as IconComponent, path: '/net-worth' },
      { label: 'Net Worth History', icon: ChartSquare as IconComponent, path: '/net-worth-history' },
      { label: 'Time Machine', icon: Calendar as IconComponent, path: '/time-machine' },
    ],
  },
  {
    label: 'Money In/Out',
    items: [
      { label: 'Income', icon: Wallet as IconComponent, path: '/income' },
      { label: 'Expenses', icon: MoneyRemove as IconComponent, path: '/expenses' },
      { label: 'Subscriptions', icon: RefreshCircle as IconComponent, path: '/subscriptions' },
      { label: 'Recurring Detect', icon: RefreshCircle as IconComponent, path: '/recurring-detect' },
      { label: 'Subscription Killer', icon: Danger as IconComponent, path: '/subscription-killer' },
      { label: 'Bad Habits', icon: Danger as IconComponent, path: '/bad-habits' },
      { label: 'Receipt Split', icon: MoneySend as IconComponent, path: '/receipt-split' },
      { label: 'Regret Tracker', icon: Danger as IconComponent, path: '/regret' },
    ],
  },
  {
    label: 'Debt & People',
    items: [
      { label: 'Loans & Debt', icon: Card as IconComponent, path: '/loans' },
      { label: 'Debt Payoff', icon: Calculator as IconComponent, path: '/debt-payoff' },
      { label: 'People', icon: Profile2User as IconComponent, path: '/people' },
      { label: 'Paying People', icon: MoneySend as IconComponent, path: '/paying-people' },
      { label: 'Household', icon: Profile2User as IconComponent, path: '/household' },
      { label: 'Couple Sync', icon: Heart as IconComponent, path: '/couple' },
    ],
  },
  {
    label: 'Goals & Growth',
    items: [
      { label: 'Savings', icon: Flag2 as IconComponent, path: '/goals' },
      { label: 'Savings Intentions', icon: Lamp as IconComponent, path: '/savings-intentions' },
      { label: 'Payment Channels', icon: Card as IconComponent, path: '/payment-channels' },
      { label: 'Investments', icon: ChartSquare as IconComponent, path: '/investments' },
      { label: 'AI Trading', icon: MoneyChange as IconComponent, path: '/trading' },
      { label: 'Priorities', icon: TrendUp as IconComponent, path: '/priorities' },
      { label: 'Budget Planner', icon: MoneyChange as IconComponent, path: '/budget' },
      { label: 'Date Budgets', icon: Calendar as IconComponent, path: '/date-budgets' },
      { label: 'What-If Simulator', icon: TrendUp as IconComponent, path: '/simulator' },
      { label: 'Bill Calendar', icon: Calendar as IconComponent, path: '/bill-calendar' },
      { label: 'Life Timeline', icon: TrendUp as IconComponent, path: '/timeline' },
      { label: 'Purchase Advisor', icon: MoneyChange as IconComponent, path: '/purchase-advisor' },
      { label: 'Peer Benchmarks', icon: Profile2User as IconComponent, path: '/benchmarks' },
      { label: 'Financial Streaks', icon: Flag2 as IconComponent, path: '/streaks' },
      { label: 'Windfall Auto-Pilot', icon: Wallet as IconComponent, path: '/windfall' },
      { label: 'Tax Planner', icon: MoneyChange as IconComponent, path: '/tax-planner' },
      { label: 'Wishlist', icon: Flag2 as IconComponent, path: '/wishlist' },
      { label: 'Emergency Fund', icon: ShieldTick as IconComponent, path: '/emergency-fund' },
      { label: 'Cash Flow', icon: Calendar as IconComponent, path: '/cash-flow' },
      { label: 'Sinking Funds', icon: Wallet as IconComponent, path: '/sinking-funds' },
      { label: 'Year-End Report', icon: ChartSquare as IconComponent, path: '/year-end-report' },
    ],
  },
  {
    label: 'Wellness',
    items: [
      { label: 'Financial Mood', icon: Heart as IconComponent, path: '/mood' },
    ],
  },
  {
    label: 'AI & Insights',
    items: [
      { label: 'ISP & Network', icon: Routing2 as IconComponent, path: '/isp' },
      { label: 'AI Chat', icon: MessageText as IconComponent, path: '/ai-chat' },
      { label: 'AI Insights', icon: Lamp as IconComponent, path: '/ai-insights' },
      { label: 'Health Score', icon: Activity as IconComponent, path: '/health-score' },
      { label: 'Reminders', icon: Notification as IconComponent, path: '/reminders' },
      { label: 'Anomalies', icon: Activity as IconComponent, path: '/anomalies' },
      { label: 'Financial Memoir', icon: Lamp as IconComponent, path: '/memoir' },
      { label: 'Morning Briefing', icon: Notification as IconComponent, path: '/morning-briefing' },
      { label: 'Retail Therapy Guard', icon: Heart as IconComponent, path: '/retail-therapy' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Profile', icon: ProfileCircle as IconComponent, path: '/profile' },
      { label: 'Categories', icon: Tag as IconComponent, path: '/categories' },
      { label: 'AI Provider', icon: Key as IconComponent, path: '/openai-key' },
      { label: 'AI Personality', icon: Lamp as IconComponent, path: '/ai-personality' },
      { label: 'Data', icon: Data as IconComponent, path: '/data' },
      { label: 'Vault Sync', icon: Shield as IconComponent, path: '/vault-sync' },
      { label: 'Document Vault', icon: Box as IconComponent, path: '/document-vault' },
      { label: 'Backup', icon: Shield as IconComponent, path: '/backup' },
      { label: 'Multi-Currency', icon: MoneyChange as IconComponent, path: '/multi-currency' },
      { label: 'Plugins', icon: Box as IconComponent, path: '/plugins' },
    ],
  },
  {
    label: 'Customize',
    items: [
      { label: 'Theme Studio', icon: ColorSwatch as IconComponent, path: '/theme-studio' },
      { label: 'Sidebar Layout', icon: Setting2 as IconComponent, path: '/sidebar-customize' },
    ],
  },
]

// Items that can never be hidden — so user always has a way to access settings & home.
export const ALWAYS_VISIBLE_PATHS: string[] = [
  '/dashboard',
  '/sidebar-customize',
  '/theme-studio',
]

// Curated defaults for new users — only the most essential pages.
// All other pages are hidden until user enables them via Sidebar Layout.
export const DEFAULT_VISIBLE_PATHS: string[] = [
  // Overview
  '/dashboard',
  '/net-worth',
  // Money
  '/income',
  '/expenses',
  '/subscriptions',
  // Debt & People
  '/loans',
  // Goals & Growth
  '/goals',
  '/savings-intentions',
  '/payment-channels',
  '/budget',
  '/investments',
  // AI
  '/ai-chat',
  '/isp',
  '/ai-insights',
  '/health-score',
  // Settings
  '/profile',
  '/categories',
  '/openai-key',
  // Customize (always at bottom)
  '/theme-studio',
  '/sidebar-customize',
]

// Build the initial hidden list from navSections - DEFAULT_VISIBLE_PATHS
export function getDefaultHiddenItems(): string[] {
  const visible = new Set(DEFAULT_VISIBLE_PATHS)
  const hidden: string[] = []
  for (const section of navSections) {
    for (const item of section.items) {
      if (!visible.has(item.path)) hidden.push(item.path)
    }
  }
  return hidden
}
