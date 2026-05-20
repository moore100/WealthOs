import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut, CommandSeparator
} from '@/components/ui/command'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard, Repeat,
  Skull, Users, HandCoins, Target, BarChart3, PiggyBank, Calendar,
  Heart, MessageSquare, Lightbulb, Activity, Palette, User, Tag,
  Key, Database, Shield, Wallet, Plus, Puzzle, AlertTriangle, Calculator, Home, Gift, FileText, Globe
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', section: 'Pages' },
  { label: 'Net Worth', icon: TrendingUp, path: '/net-worth', section: 'Pages' },
  { label: 'Income', icon: Wallet, path: '/income', section: 'Pages' },
  { label: 'Expenses', icon: TrendingDown, path: '/expenses', section: 'Pages' },
  { label: 'Subscriptions', icon: Repeat, path: '/subscriptions', section: 'Pages' },
  { label: 'Bad Habits', icon: Skull, path: '/bad-habits', section: 'Pages' },
  { label: 'Loans & Debt', icon: CreditCard, path: '/loans', section: 'Pages' },
  { label: 'People', icon: Users, path: '/people', section: 'Pages' },
  { label: 'Paying People', icon: HandCoins, path: '/paying-people', section: 'Pages' },
  { label: 'Savings Goals', icon: Target, path: '/goals', section: 'Pages' },
  { label: 'Investments', icon: BarChart3, path: '/investments', section: 'Pages' },
  { label: 'Priorities', icon: Target, path: '/priorities', section: 'Pages' },
  { label: 'AI Trading', icon: BarChart3, path: '/trading', section: 'Pages' },
  { label: 'Budget Planner', icon: PiggyBank, path: '/budget', section: 'Pages' },
  { label: 'Date Budgets', icon: Calendar, path: '/date-budgets', section: 'Pages' },
  { label: 'Financial Mood', icon: Heart, path: '/mood', section: 'Pages' },
  { label: 'AI Chat', icon: MessageSquare, path: '/ai-chat', section: 'AI' },
  { label: 'AI Insights', icon: Lightbulb, path: '/ai-insights', section: 'AI' },
  { label: 'Health Score', icon: Activity, path: '/health-score', section: 'AI' },
  { label: 'What-If Simulator', icon: Calculator, path: '/simulator', section: 'Pages' },
  { label: 'Bill Calendar', icon: Calendar, path: '/bill-calendar', section: 'Pages' },
  { label: 'Household', icon: Home, path: '/household', section: 'Pages' },
  { label: 'Life Timeline', icon: TrendingUp, path: '/timeline', section: 'Pages' },
  { label: 'Purchase Advisor', icon: PiggyBank, path: '/purchase-advisor', section: 'Pages' },
  { label: 'Peer Benchmarks', icon: Users, path: '/benchmarks', section: 'Pages' },
  { label: 'Financial Streaks', icon: Target, path: '/streaks', section: 'Pages' },
  { label: 'Subscription Killer', icon: Skull, path: '/subscription-killer', section: 'Pages' },
  { label: 'Windfall Auto-Pilot', icon: Wallet, path: '/windfall', section: 'Pages' },
  { label: 'Receipt Split', icon: CreditCard, path: '/receipt-split', section: 'Pages' },
  { label: 'Net Worth History', icon: TrendingUp, path: '/net-worth-history', section: 'Pages' },
  { label: 'Tax Planner', icon: Calculator, path: '/tax-planner', section: 'Pages' },
  { label: 'Wishlist', icon: Gift, path: '/wishlist', section: 'Pages' },
  { label: 'Cash Flow Forecast', icon: Calendar, path: '/cash-flow', section: 'Pages' },
  { label: 'Sinking Funds', icon: PiggyBank, path: '/sinking-funds', section: 'Pages' },
  { label: 'Recurring Detect', icon: Repeat, path: '/recurring-detect', section: 'Pages' },
  { label: 'Year-End Report', icon: FileText, path: '/year-end-report', section: 'Pages' },
  { label: 'Encrypted Backup', icon: Shield, path: '/backup', section: 'Settings' },
  { label: 'Multi-Currency', icon: Globe, path: '/multi-currency', section: 'Settings' },
  { label: 'Anomalies', icon: AlertTriangle, path: '/anomalies', section: 'AI' },
  { label: 'Financial Memoir', icon: Lightbulb, path: '/memoir', section: 'AI' },
  { label: 'Morning Briefing', icon: MessageSquare, path: '/morning-briefing', section: 'AI' },
  { label: 'Retail Therapy Guard', icon: Heart, path: '/retail-therapy', section: 'AI' },
  { label: 'Theme Studio', icon: Palette, path: '/theme-studio', section: 'Settings' },
  { label: 'Profile', icon: User, path: '/profile', section: 'Settings' },
  { label: 'Categories', icon: Tag, path: '/categories', section: 'Settings' },
  { label: 'AI Provider', icon: Key, path: '/openai-key', section: 'Settings' },
  { label: 'AI Personality', icon: Lightbulb, path: '/ai-personality', section: 'Settings' },
  { label: 'Data Management', icon: Database, path: '/data', section: 'Settings' },
  { label: 'Vault Sync', icon: Shield, path: '/vault-sync', section: 'Settings' },
  { label: 'Document Vault', icon: FileText, path: '/document-vault', section: 'Settings' },
  { label: 'Plugins', icon: Puzzle, path: '/plugins', section: 'Settings' },
]

const sections = ['Pages', 'AI', 'Settings']

export default function CommandPalette() {
  const navigate = useNavigate()
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  const handleSelect = (path: string) => {
    setCommandPaletteOpen(false)
    navigate(path)
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {sections.map((section) => {
          const items = navItems.filter(i => i.section === section)
          return (
            <CommandGroup key={section} heading={section}>
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem key={item.path} onSelect={() => handleSelect(item.path)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )
        })}
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect('/expenses')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('/income')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Income
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
